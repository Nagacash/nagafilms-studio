import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getDb, schema } from '@/lib/db';
import {
  estimateImageCredits,
  holdCredits,
  releaseHold,
  captureHold,
} from '@/lib/credits';
import {
  submitImageGeneration,
  getPredictionResult,
  extractResultUrls,
  isPredictionDone,
} from '@/lib/muapi-server';
import { clientKey, rateLimit, tooMany } from '@/lib/rate-limit';

const bodySchema = z.object({
  modality: z.enum(['image']).default('image'),
  model: z.string().min(1).max(120),
  prompt: z.string().min(1).max(8000),
  params: z.record(z.any()).optional(),
});

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const limited = rateLimit(`generate:${session.user.id}:${clientKey(req)}`, {
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });
    if (!limited.ok) return tooMany(limited.retryAfter);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
    }

    const { model, prompt, params = {} } = parsed.data;
    const costCredits = await estimateImageCredits({ model });
    const db = getDb();
    const userId = session.user.id;

    const [generation] = await db
      .insert(schema.generations)
      .values({
        userId,
        model,
        modality: 'image',
        prompt,
        params,
        status: 'pending',
        costCredits,
        heldCredits: costCredits,
      })
      .returning();

    const held = await holdCredits(userId, costCredits, generation.id);
    if (!held) {
      await db
        .update(schema.generations)
        .set({ status: 'failed', errorMessage: 'Insufficient credits', heldCredits: 0 })
        .where(eq(schema.generations.id, generation.id));
      return NextResponse.json(
        { error: 'Insufficient credits', costCredits, generationId: generation.id },
        { status: 402 }
      );
    }

    try {
      const { requestId } = await submitImageGeneration({ model, prompt, params });
      await db
        .update(schema.generations)
        .set({ status: 'processing', muapiRequestId: requestId })
        .where(eq(schema.generations.id, generation.id));

      // Best-effort short poll (Vercel-friendly); client can continue via GET
      let finalStatus = 'processing';
      let resultUrls = null;
      let errorMessage = null;

      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const result = await getPredictionResult(requestId);
        const state = isPredictionDone(result);
        if (state === 'completed') {
          resultUrls = extractResultUrls(result);
          finalStatus = 'completed';
          await captureHold(generation.id);
          await db
            .update(schema.generations)
            .set({
              status: 'completed',
              resultUrls,
              completedAt: new Date(),
              heldCredits: 0,
            })
            .where(eq(schema.generations.id, generation.id));
          break;
        }
        if (state === 'failed') {
          errorMessage = result?.error || result?.message || 'Generation failed';
          finalStatus = 'failed';
          await releaseHold(userId, costCredits, generation.id);
          await db
            .update(schema.generations)
            .set({
              status: 'failed',
              errorMessage,
              completedAt: new Date(),
              heldCredits: 0,
            })
            .where(eq(schema.generations.id, generation.id));
          break;
        }
      }

      return NextResponse.json({
        generationId: generation.id,
        status: finalStatus,
        costCredits,
        resultUrls,
        errorMessage,
      });
    } catch (err) {
      await releaseHold(userId, costCredits, generation.id);
      await db
        .update(schema.generations)
        .set({
          status: 'failed',
          errorMessage: err.message || 'MuAPI error',
          heldCredits: 0,
          completedAt: new Date(),
        })
        .where(eq(schema.generations.id, generation.id));
      console.error('[generate]', err);
      return NextResponse.json(
        { error: err.message || 'Generation failed', generationId: generation.id },
        { status: err.status || 502 }
      );
    }
  } catch (err) {
    console.error('[generate]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
