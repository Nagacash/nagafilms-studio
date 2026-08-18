import { createHmac, timingSafeEqual } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { getDb, schema } from '@/lib/db';
import { captureHold, releaseHold } from '@/lib/credits';
import { getPricingConfig, usdToCredits as serverUsdToCredits } from '@/lib/pricing';
import {
  estimateStoryboardCredits,
  STORYBOARD_USD_ESTIMATES,
} from '@/lib/storyboard-pricing';
import { assertWebhookUrl, SSRF_FETCH } from '@/lib/ssrf';

const { generations } = schema;

/** Billable MuAPI storyboard POSTs (path relative to /api/v1/). */
const BILLABLE = [
  {
    re: /^storyboard-projects\/generate\/?$/,
    step: 'generateProject',
    projectFrom: 'bodyOrResponse',
  },
  {
    re: /^storyboard-projects\/([^/]+)\/generate-library\/?$/,
    step: 'generateLibrary',
    projectFrom: 'path',
  },
  {
    re: /^storyboard-projects\/([^/]+)\/generate-shots\/?$/,
    step: 'generateShots',
    projectFrom: 'path',
  },
  {
    re: /^storyboard-projects\/([^/]+)\/generate-pdf\/?$/,
    step: 'generatePdf',
    projectFrom: 'path',
  },
  {
    re: /^storyboard-episodes\/add\/?$/,
    step: 'addEpisode',
    projectFrom: 'body',
  },
  {
    re: /^storyboard-scenes\/add\/?$/,
    step: 'addScene',
    projectFrom: 'body',
  },
  {
    re: /^storyboard-shots\/add\/?$/,
    step: 'addShot',
    projectFrom: 'body',
  },
  {
    re: /^storyboard-shots\/([^/]+)\/regenerate\/?$/,
    step: 'regenShot',
    projectFrom: 'none',
  },
  {
    re: /^storyboard-characters\/([^/]+)\/regenerate\/?$/,
    step: 'regenCharacter',
    projectFrom: 'none',
  },
];

function stripV1(upstreamPath) {
  return String(upstreamPath || '')
    .replace(/^\/api\/v1\/?/, '')
    .replace(/^\//, '');
}

export function matchStoryboardBillable(method, upstreamPath) {
  if (String(method || '').toUpperCase() !== 'POST') return null;
  const path = stripV1(upstreamPath);
  for (const rule of BILLABLE) {
    const m = path.match(rule.re);
    if (m) {
      return {
        step: rule.step,
        projectFrom: rule.projectFrom,
        pathProjectId: m[1] || null,
      };
    }
  }
  return null;
}

export function matchStoryboardProjectGet(method, upstreamPath) {
  if (String(method || '').toUpperCase() !== 'GET') return null;
  const path = stripV1(upstreamPath);
  const m = path.match(/^storyboard-projects\/([^/]+)\/?$/);
  if (!m) return null;
  return { projectId: m[1] };
}

/**
 * @param {string} step
 * @param {object} [body]
 * @param {{ pathProjectId?: string|null }} [match]
 */
export function estimateCreditsForStoryboardStep(step, body = {}, match = {}) {
  const pricing = getPricingConfig();
  const episodes = Number(body?.num_episodes) || 1;
  const usePro = Boolean(body?.use_pro);
  const est = estimateStoryboardCredits(
    step,
    { episodes, usePro, shots: 0 },
    pricing
  );
  return {
    ...est,
    step,
    projectIdHint:
      match.pathProjectId ||
      (body?.project_id != null ? String(body.project_id) : null),
    usdTable: STORYBOARD_USD_ESTIMATES,
  };
}

function webhookSecret() {
  return (
    process.env.MUAPI_WEBHOOK_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    'naga-dev-webhook'
  );
}

export function signStoryboardWebhook(generationId) {
  return createHmac('sha256', webhookSecret())
    .update(String(generationId))
    .digest('hex')
    .slice(0, 32);
}

export function verifyStoryboardWebhookSig(generationId, sig) {
  if (!generationId || !sig) return false;
  const expected = signStoryboardWebhook(generationId);
  try {
    const a = Buffer.from(String(sig));
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function buildStoryboardWebhookUrl(generationId, fanoutUrl) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
  if (!base) return fanoutUrl || null;
  const sig = signStoryboardWebhook(generationId);
  const url = new URL(`${base}/api/webhooks/muapi/storyboard`);
  url.searchParams.set('gid', generationId);
  url.searchParams.set('sig', sig);
  if (fanoutUrl) url.searchParams.set('fanout', '1');
  return url.toString();
}

export function classifyStoryboardOutcome(statusOrPayload) {
  const raw =
    typeof statusOrPayload === 'string'
      ? statusOrPayload
      : statusOrPayload?.status ||
        statusOrPayload?.state ||
        statusOrPayload?.event ||
        statusOrPayload?.type ||
        '';
  const s = String(raw || '').toLowerCase();
  if (!s) return 'pending';
  if (/(fail|error|cancel)/.test(s)) return 'failed';
  if (/(complete|ready|succeed|done|success)/.test(s)) return 'completed';
  if (/(process|generat|queue|pending|runn|progress|start|creat|wait)/.test(s)) {
    return 'pending';
  }
  return 'pending';
}

/**
 * Idempotent settle for a storyboard generation hold.
 * @returns {Promise<{ settled: boolean, outcome: string, alreadySettled?: boolean }>}
 */
export async function settleStoryboardGeneration(generationId, outcome, extra = {}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (!row) return { settled: false, outcome };

  if (row.heldCredits <= 0) {
    if (outcome === 'completed' || outcome === 'failed') {
      await db
        .update(generations)
        .set({
          status: outcome === 'completed' ? 'completed' : 'failed',
          completedAt: row.completedAt || new Date(),
          errorMessage:
            outcome === 'failed'
              ? extra.errorMessage || row.errorMessage || 'Storyboard step failed'
              : row.errorMessage,
          resultUrls: extra.resultUrls ?? row.resultUrls,
        })
        .where(eq(generations.id, generationId));
    }
    return { settled: false, outcome, alreadySettled: true };
  }

  if (outcome === 'completed') {
    const captured = await captureHold(generationId);
    if (!captured?.captured) {
      return { settled: false, outcome, alreadySettled: true };
    }
    await db
      .update(generations)
      .set({
        status: 'completed',
        heldCredits: 0,
        completedAt: new Date(),
        resultUrls: extra.resultUrls ?? row.resultUrls,
      })
      .where(eq(generations.id, generationId));
    return { settled: true, outcome };
  }

  if (outcome === 'failed') {
    const released = await releaseHold(row.userId, row.heldCredits, generationId);
    if (!released?.released) {
      return { settled: false, outcome, alreadySettled: true };
    }
    await db
      .update(generations)
      .set({
        status: 'failed',
        heldCredits: 0,
        completedAt: new Date(),
        errorMessage: extra.errorMessage || 'Storyboard step failed',
      })
      .where(eq(generations.id, generationId));
    return { settled: true, outcome };
  }

  return { settled: false, outcome: 'pending' };
}

/** Settle any open holds for a project when its status is terminal. */
export async function settleOpenHoldsForProject(userId, projectId, status) {
  const outcome = classifyStoryboardOutcome(status);
  if (outcome === 'pending') return { settled: 0 };

  const db = getDb();
  const open = await db
    .select()
    .from(generations)
    .where(
      and(
        eq(generations.userId, userId),
        eq(generations.modality, 'storyboard'),
        gt(generations.heldCredits, 0)
      )
    );

  let settled = 0;
  for (const row of open) {
    const meta = row.params || {};
    if (String(meta.projectId || '') !== String(projectId)) continue;
    const result = await settleStoryboardGeneration(row.id, outcome);
    if (result.settled) settled += 1;
  }
  return { settled, outcome };
}

export async function fanoutWebhook(url, payload) {
  if (!url || typeof url !== 'string') return;
  const allowed = assertWebhookUrl(url);
  if (!allowed.ok) {
    console.warn('[storyboard webhook fanout] blocked', allowed.error);
    return;
  }
  try {
    await fetch(allowed.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      ...SSRF_FETCH,
    });
  } catch (err) {
    console.warn('[storyboard webhook fanout]', err.message);
  }
}

/** Re-export for callers that want server usd→credits with env markup. */
export function creditsFromUsd(usd) {
  return serverUsdToCredits(usd);
}
