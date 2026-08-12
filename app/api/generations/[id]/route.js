import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { getDb, schema } from '@/lib/db';
import { captureHold, releaseHold } from '@/lib/credits';
import {
  getPredictionResult,
  extractResultUrls,
  isPredictionDone,
} from '@/lib/muapi-server';

export async function GET(_req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.generations)
      .where(
        and(eq(schema.generations.id, id), eq(schema.generations.userId, session.user.id))
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Refresh from MuAPI if still in flight
    if (
      (row.status === 'pending' || row.status === 'processing') &&
      row.muapiRequestId
    ) {
      try {
        const result = await getPredictionResult(row.muapiRequestId);
        const state = isPredictionDone(result);
        if (state === 'completed') {
          const resultUrls = extractResultUrls(result);
          await captureHold(row.id);
          const [updated] = await db
            .update(schema.generations)
            .set({
              status: 'completed',
              resultUrls,
              completedAt: new Date(),
              heldCredits: 0,
            })
            .where(eq(schema.generations.id, row.id))
            .returning();
          return NextResponse.json({ generation: updated });
        }
        if (state === 'failed') {
          if (row.heldCredits > 0) {
            await releaseHold(session.user.id, row.heldCredits, row.id);
          }
          const [updated] = await db
            .update(schema.generations)
            .set({
              status: 'failed',
              errorMessage: result?.error || result?.message || 'Generation failed',
              completedAt: new Date(),
              heldCredits: 0,
            })
            .where(eq(schema.generations.id, row.id))
            .returning();
          return NextResponse.json({ generation: updated });
        }
      } catch (err) {
        console.error('[generations/:id] poll', err);
      }
    }

    return NextResponse.json({ generation: row });
  } catch (err) {
    console.error('[generations/:id]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const { id } = await params;
    const db = getDb();
    const [row] = await db
      .select({ id: schema.generations.id })
      .from(schema.generations)
      .where(
        and(eq(schema.generations.id, id), eq(schema.generations.userId, session.user.id))
      )
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db
      .delete(schema.generations)
      .where(
        and(eq(schema.generations.id, id), eq(schema.generations.userId, session.user.id))
      );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[generations/:id DELETE]', err);
    return NextResponse.json({ error: err.message || 'Failed' }, { status: 500 });
  }
}
