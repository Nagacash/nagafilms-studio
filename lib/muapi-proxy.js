import { auth } from '@/lib/auth';
import { getBalance, holdCredits, releaseHold } from '@/lib/credits';
import { getDb, schema } from '@/lib/db';
import { and, eq, gt } from 'drizzle-orm';
import {
  buildStoryboardWebhookUrl,
  classifyStoryboardOutcome,
  estimateCreditsForStoryboardStep,
  matchStoryboardBillable,
  matchStoryboardProjectGet,
  settleOpenHoldsForProject,
  settleStoryboardGeneration,
} from '@/lib/storyboard-billing';
import {
  handleGenerationSaasPost,
  matchPredictionPoll,
  settleGenerationFromPoll,
} from '@/lib/generation-billing';
import { assertWebhookUrl } from '@/lib/ssrf';

const MUAPI_BASE = 'https://api.muapi.ai';
const MAX_OPEN_STORYBOARD_HOLDS = Number(
  process.env.STORYBOARD_MAX_OPEN_HOLDS || 5
);

/**
 * Resolve which MuAPI key to use.
 * Logged-in SaaS users → server MUAPI_API_KEY.
 * Otherwise → client header / cookie (BYO key). Never the operator key.
 */
export async function resolveMuApiKey(request) {
  try {
    const session = await auth();
    if (session?.user?.id && process.env.MUAPI_API_KEY) {
      return { apiKey: process.env.MUAPI_API_KEY, mode: 'saas', userId: session.user.id };
    }
  } catch {
    // fall through
  }

  const headerKey = request.headers.get('x-api-key');
  if (headerKey && headerKey !== 'session') {
    return { apiKey: headerKey, mode: 'byo', userId: null };
  }

  const cookieKey = request.cookies.get('muapi_key')?.value;
  if (cookieKey) {
    return { apiKey: cookieKey, mode: 'byo', userId: null };
  }

  return { apiKey: null, mode: 'none', userId: null };
}

export function stripHopHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie');
  headers.delete('content-length');
  return headers;
}

function isScriptsPath(upstreamPath) {
  return /storyboard-projects\/[^/]+\/(generate-scripts|scripts)\/?$/.test(
    String(upstreamPath || '')
  );
}

function parseJsonBody(buf) {
  if (!buf?.byteLength) return {};
  try {
    return JSON.parse(Buffer.from(buf).toString('utf8'));
  } catch {
    return {};
  }
}

async function forwardToMuApi({ request, upstreamPath, apiKey, bodyBuf, method }) {
  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}${upstreamPath}${search}`;
  const headers = stripHopHeaders(request);
  headers.set('x-api-key', apiKey);
  if (bodyBuf?.byteLength) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(targetUrl, {
    method: method || request.method,
    headers,
    body: bodyBuf?.byteLength ? bodyBuf : undefined,
  });
}

async function countOpenStoryboardHoldsStrict(userId) {
  const db = getDb();
  const rows = await db
    .select({ id: schema.generations.id })
    .from(schema.generations)
    .where(
      and(
        eq(schema.generations.userId, userId),
        eq(schema.generations.modality, 'storyboard'),
        gt(schema.generations.heldCredits, 0)
      )
    );
  return rows.length;
}

/**
 * SaaS hold + signed webhook injection for billable storyboard POSTs.
 * Returns null when not applicable (caller should use plain proxy).
 */
async function handleStoryboardSaasPost({
  request,
  upstreamPath,
  userId,
  apiKey,
  bodyBuf,
}) {
  const match = matchStoryboardBillable(request.method, upstreamPath);
  if (!match) return null;

  const body = parseJsonBody(bodyBuf);
  const estimate = estimateCreditsForStoryboardStep(match.step, body, match);
  const costCredits = Math.max(0, Number(estimate.credits) || 0);

  const open = await countOpenStoryboardHoldsStrict(userId);
  if (open >= MAX_OPEN_STORYBOARD_HOLDS) {
    return Response.json(
      {
        error: `Too many in-flight storyboard jobs (max ${MAX_OPEN_STORYBOARD_HOLDS}). Wait for one to finish.`,
        code: 'RATE_LIMIT',
      },
      { status: 429 }
    );
  }

  const fanoutUrl =
    typeof body.webhook_url === 'string' && body.webhook_url.trim()
      ? (assertWebhookUrl(body.webhook_url.trim()).ok ? body.webhook_url.trim() : null)
      : null;

  const db = getDb();
  const projectIdHint =
    estimate.projectIdHint ||
    (body.project_id != null ? String(body.project_id) : null);

  const [generation] = await db
    .insert(schema.generations)
    .values({
      userId,
      model: `storyboard:${match.step}`,
      modality: 'storyboard',
      prompt:
        typeof body.prompt === 'string'
          ? body.prompt.slice(0, 8000)
          : typeof body.description === 'string'
            ? body.description.slice(0, 8000)
            : null,
      params: {
        step: match.step,
        projectId: projectIdHint,
        fanoutUrl,
        estimateUsd: estimate.usd,
        approximate: true,
      },
      status: 'pending',
      costCredits,
      heldCredits: costCredits,
    })
    .returning();

  const held = await holdCredits(userId, costCredits, generation.id);
  if (!held) {
    await db
      .update(schema.generations)
      .set({
        status: 'failed',
        errorMessage: 'Insufficient credits',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id));
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

  const nagaWebhook = buildStoryboardWebhookUrl(generation.id, fanoutUrl);
  const forwardBody = {
    ...body,
    ...(nagaWebhook ? { webhook_url: nagaWebhook } : {}),
  };
  const forwardBuf = Buffer.from(JSON.stringify(forwardBody), 'utf8');

  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}${upstreamPath}${search}`;
  const headers = stripHopHeaders(request);
  headers.set('x-api-key', apiKey);
  headers.set('Content-Type', 'application/json');

  let response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: forwardBuf,
    });
  } catch (err) {
    await releaseHold(userId, costCredits, generation.id);
    await db
      .update(schema.generations)
      .set({
        status: 'failed',
        errorMessage: err.message || 'MuAPI network error',
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id));
    return Response.json(
      { error: err.message || 'MuAPI unreachable', generationId: generation.id },
      { status: 502 }
    );
  }

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { raw: text };
  }

  if (!response.ok) {
    await releaseHold(userId, costCredits, generation.id);
    await db
      .update(schema.generations)
      .set({
        status: 'failed',
        errorMessage:
          typeof data?.error === 'string'
            ? data.error
            : typeof data?.detail === 'string'
              ? data.detail
              : `MuAPI ${response.status}`,
        heldCredits: 0,
        completedAt: new Date(),
      })
      .where(eq(schema.generations.id, generation.id));
    return Response.json(
      {
        ...(typeof data === 'object' && data ? data : { error: 'Upstream error' }),
        generationId: generation.id,
        costCredits,
      },
      { status: response.status }
    );
  }

  const projectId =
    data?.id ??
    data?.project_id ??
    data?.project?.id ??
    projectIdHint ??
    null;
  const requestId =
    data?.request_id || data?.task_id || data?.job_id || null;
  const outcome = classifyStoryboardOutcome(data);

  await db
    .update(schema.generations)
    .set({
      status: outcome === 'failed' ? 'failed' : 'processing',
      muapiRequestId: requestId ? String(requestId) : null,
      params: {
        step: match.step,
        projectId: projectId != null ? String(projectId) : projectIdHint,
        fanoutUrl,
        estimateUsd: estimate.usd,
        approximate: true,
      },
    })
    .where(eq(schema.generations.id, generation.id));

  if (outcome === 'completed') {
    await settleStoryboardGeneration(generation.id, 'completed', {
      resultUrls: data,
    });
  } else if (outcome === 'failed') {
    await settleStoryboardGeneration(generation.id, 'failed', {
      errorMessage: data?.error || data?.detail || 'Failed',
    });
  }

  const walletBalance = await getBalance(userId);

  return Response.json(
    {
      ...data,
      naga: {
        phase:
          outcome === 'failed'
            ? 'released'
            : outcome === 'completed'
              ? 'captured'
              : 'hold',
        generationId: generation.id,
        costCredits,
        approximate: true,
        webhook: Boolean(nagaWebhook),
        walletBalance,
      },
    },
    { status: response.status }
  );
}

export async function proxyToMuApi(request, { upstreamPath }) {
  const { apiKey, mode, userId } = await resolveMuApiKey(request);
  if (!apiKey) {
    return Response.json(
      { error: 'Unauthorized — log in or provide an API key' },
      { status: 401 }
    );
  }

  // Product does not offer AI script generation.
  if (isScriptsPath(upstreamPath)) {
    return Response.json(
      {
        error: 'Script generation is not offered on Naga Films',
        code: 'FEATURE_DISABLED',
      },
      { status: 410 }
    );
  }

  if (/watermark-remover/i.test(String(upstreamPath || ''))) {
    return Response.json(
      { error: 'Watermark removal is not offered', code: 'FEATURE_DISABLED' },
      { status: 410 }
    );
  }

  const method = request.method;
  let bodyBuf;
  if (method !== 'GET' && method !== 'HEAD') {
    bodyBuf = await request.arrayBuffer();
  }

  if (mode === 'saas' && userId && method === 'POST') {
    const storyboardBilled = await handleStoryboardSaasPost({
      request,
      upstreamPath,
      userId,
      apiKey,
      bodyBuf,
    });
    if (storyboardBilled) return storyboardBilled;

    const genBilled = await handleGenerationSaasPost({
      upstreamPath,
      userId,
      apiKey,
      bodyBuf,
      forwardFetch: (buf) =>
        forwardToMuApi({
          request,
          upstreamPath,
          apiKey,
          bodyBuf: buf,
          method: 'POST',
        }),
    });
    if (genBilled) return genBilled;
  }

  if (mode === 'saas' && userId && method !== 'GET' && method !== 'HEAD') {
    try {
      const bal = await getBalance(userId);
      if (bal <= 0) {
        return Response.json(
          { error: 'Insufficient credits — buy a pack to continue', code: 'NO_CREDITS' },
          { status: 402 }
        );
      }
    } catch (err) {
      console.error('[proxy] credit check', err);
    }
  }

  const { search } = new URL(request.url);
  const targetUrl = `${MUAPI_BASE}${upstreamPath}${search}`;
  const headers = stripHopHeaders(request);
  headers.set('x-api-key', apiKey);

  const response = await fetch(targetUrl, {
    method,
    headers,
    body: bodyBuf?.byteLength ? bodyBuf : undefined,
  });
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json();

    if (mode === 'saas' && userId && response.ok && method === 'GET') {
      const pollMatch = matchPredictionPoll(method, upstreamPath);
      if (pollMatch) {
        try {
          const settlement = await settleGenerationFromPoll(
            userId,
            pollMatch.requestId,
            data
          );
          if (settlement?.settled) {
            data.naga = {
              phase: settlement.outcome === 'failed' ? 'released' : 'captured',
              walletBalance: settlement.walletBalance,
              costCredits: settlement.costCredits,
              restoredCredits: settlement.restoredCredits,
            };
          }
        } catch (err) {
          console.warn('[proxy] generation poll settle', err.message);
        }
      }

      const projMatch = matchStoryboardProjectGet(method, upstreamPath);
      if (projMatch?.projectId) {
        try {
          await settleOpenHoldsForProject(
            userId,
            projMatch.projectId,
            data?.status || data?.state || data
          );
          data.naga = {
            ...(data.naga || {}),
            walletBalance: await getBalance(userId),
          };
        } catch (err) {
          console.warn('[proxy] storyboard settle', err.message);
        }
      }
    }

    return Response.json(data, { status: response.status });
  }

  const buf = await response.arrayBuffer();
  return new Response(buf, {
    status: response.status,
    headers: {
      'content-type': contentType || 'application/octet-stream',
    },
  });
}
