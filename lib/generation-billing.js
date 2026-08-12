import { eq, and, gt } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import {
  holdCredits,
  releaseHold,
  captureHold,
  getBalance,
  estimateModelCredits,
} from '@/lib/credits';
import { isPredictionDone } from '@/lib/muapi-server';

const { generations } = schema;

const NON_BILLABLE_PREFIXES = [
  'storyboard',
  'upload_file',
  'upload',
  'account',
  'models',
  'predictions',
  'character',
];

/** POST /api/v1/{model-endpoint} — async generation submit (not storyboard). */
export function matchGenerationPost(method, upstreamPath) {
  if (method !== 'POST') return null;
  const rel = String(upstreamPath || '')
    .replace(/^\/api\/v1\/?/, '')
    .replace(/\/$/, '');
  if (!rel || rel.includes('..')) return null;
  if (NON_BILLABLE_PREFIXES.some((p) => rel === p || rel.startsWith(`${p}/`))) {
    return null;
  }
  return { endpoint: rel, modelSlug: rel.split('/')[0] };
}

export function matchPredictionPoll(method, upstreamPath) {
  if (method !== 'GET') return null;
  const m = String(upstreamPath || '').match(
    /\/api\/v1\/predictions\/([^/]+)\/result\/?$/
  );
  if (!m) return null;
  return { requestId: m[1] };
}

function parseJsonBody(buf) {
  if (!buf?.byteLength) return {};
  try {
    return JSON.parse(Buffer.from(buf).toString('utf8'));
  } catch {
    return {};
  }
}

function classifySubmitOutcome(data) {
  const status = String(data?.status || '').toLowerCase();
  if (status === 'failed' || status === 'error') return 'failed';
  if (
    status === 'completed' ||
    status === 'succeeded' ||
    status === 'success'
  ) {
    return 'completed';
  }
  if (data?.request_id || data?.id) return 'processing';
  return 'processing';
}

/**
 * SaaS hold for standard model POSTs. Returns Response or null if not applicable.
 */
export async function handleGenerationSaasPost({
  upstreamPath,
  userId,
  apiKey,
  bodyBuf,
  forwardFetch,
}) {
  const match = matchGenerationPost('POST', upstreamPath);
  if (!match) return null;

  const body = parseJsonBody(bodyBuf);
  const modelKey = body.model || match.modelSlug || match.endpoint;
  const costCredits = await estimateModelCredits(modelKey);
  if (costCredits <= 0) return null;

  const db = getDb();
  const [generation] = await db
    .insert(generations)
    .values({
      userId,
      model: modelKey,
      modality: 'generation',
      prompt:
        typeof body.prompt === 'string' ? body.prompt.slice(0, 8000) : null,
      params: { endpoint: match.endpoint },
      status: 'pending',
      costCredits,
      heldCredits: costCredits,
    })
    .returning();

  const held = await holdCredits(userId, costCredits, generation.id);
  if (!held) {
    await db
      .update(generations)
      .set({
        status: 'failed',
        errorMessage: 'Insufficient credits',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));
    return Response.json(
      {
        error: 'Insufficient credits',
        code: 'NO_CREDITS',
        costCredits,
        generationId: generation.id,
        naga: {
          phase: 'denied',
          costCredits,
          walletBalance: await getBalance(userId),
        },
      },
      { status: 402 }
    );
  }

  let response;
  try {
    response = await forwardFetch(bodyBuf);
  } catch (err) {
    await releaseHold(userId, costCredits, generation.id);
    await db
      .update(generations)
      .set({
        status: 'failed',
        errorMessage: err.message || 'Upstream error',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));
    throw err;
  }

  const data =
    response && typeof response.json === 'function'
      ? await response.json()
      : response;

  if (!response.ok) {
    await releaseHold(userId, costCredits, generation.id);
    await db
      .update(generations)
      .set({
        status: 'failed',
        errorMessage:
          data?.error || data?.detail || `Upstream ${response.status}`,
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));
    return Response.json(
      {
        ...data,
        naga: {
          phase: 'released',
          costCredits,
          walletBalance: await getBalance(userId),
          generationId: generation.id,
        },
      },
      { status: response.status }
    );
  }

  const requestId = data?.request_id || data?.id || data?.task_id || null;
  const submitOutcome = classifySubmitOutcome(data);

  await db
    .update(generations)
    .set({
      status: submitOutcome === 'failed' ? 'failed' : 'processing',
      muapiRequestId: requestId ? String(requestId) : null,
    })
    .where(eq(generations.id, generation.id));

  if (submitOutcome === 'completed') {
    await captureHold(generation.id);
    await db
      .update(generations)
      .set({ status: 'completed', heldCredits: 0, completedAt: new Date() })
      .where(eq(generations.id, generation.id));
  } else if (submitOutcome === 'failed') {
    await releaseHold(userId, costCredits, generation.id);
    await db
      .update(generations)
      .set({
        status: 'failed',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, generation.id));
  }

  const walletBalance = await getBalance(userId);

  return Response.json(
    {
      ...data,
      naga: {
        phase: submitOutcome === 'failed' ? 'released' : 'hold',
        generationId: generation.id,
        costCredits,
        walletBalance,
      },
    },
    { status: response.status }
  );
}

/** Settle open hold when client polls prediction result. */
export async function settleGenerationFromPoll(userId, requestId, pollData) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        eq(generations.muapiRequestId, String(requestId)),
        gt(generations.heldCredits, 0)
      )
    )
    .limit(1);

  if (!row) return null;

  const state = isPredictionDone(pollData);
  if (state === 'processing') return { settled: false };

  if (state === 'completed') {
    await captureHold(row.id);
    await db
      .update(generations)
      .set({
        status: 'completed',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, row.id));
    return {
      settled: true,
      outcome: 'completed',
      costCredits: row.costCredits,
      walletBalance: await getBalance(userId),
    };
  }

  if (state === 'failed') {
    const released = await releaseHold(userId, row.heldCredits, row.id);
    await db
      .update(generations)
      .set({
        status: 'failed',
        errorMessage: pollData?.error || pollData?.message || 'Generation failed',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(generations.id, row.id));
    return {
      settled: true,
      outcome: 'failed',
      restoredCredits: released.amount || row.heldCredits,
      walletBalance: await getBalance(userId),
    };
  }

  return null;
}

export { parseJsonBody };
