import {
  fanoutWebhook,
  settleStoryboardGeneration,
  verifyStoryboardWebhookSig,
  classifyStoryboardOutcome,
} from '@/lib/storyboard-billing';
import { getDb, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

/**
 * MuAPI → Naga storyboard webhook.
 * URL is minted by the SaaS proxy with ?gid=&sig= (HMAC).
 * Optional fanout to the caller's original webhook_url stored on the generation.
 */
export async function POST(request) {
  const url = new URL(request.url);
  const gid = url.searchParams.get('gid');
  const sig = url.searchParams.get('sig');

  if (!verifyStoryboardWebhookSig(gid, sig)) {
    return Response.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const outcome = classifyStoryboardOutcome(payload);
  const result = await settleStoryboardGeneration(gid, outcome, {
    errorMessage:
      payload?.error || payload?.message || payload?.detail || undefined,
    resultUrls: payload,
  });

  // Fan-out to user's webhook if they supplied one at job start.
  try {
    const db = getDb();
    const [row] = await db
      .select()
      .from(schema.generations)
      .where(eq(schema.generations.id, gid))
      .limit(1);
    const fanout = row?.params?.fanoutUrl;
    if (fanout) {
      await fanoutWebhook(fanout, {
        source: 'naga-films',
        generationId: gid,
        outcome,
        settled: result.settled,
        payload,
      });
    }
  } catch (err) {
    console.warn('[storyboard webhook] fanout failed', err.message);
  }

  return Response.json({
    ok: true,
    generationId: gid,
    outcome,
    settled: result.settled,
    alreadySettled: result.alreadySettled || false,
  });
}

/** Health / probe */
export async function GET(request) {
  const url = new URL(request.url);
  const gid = url.searchParams.get('gid');
  const sig = url.searchParams.get('sig');
  if (!gid) {
    return Response.json({ ok: true, service: 'storyboard-webhook' });
  }
  if (!verifyStoryboardWebhookSig(gid, sig)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  return Response.json({ ok: true, generationId: gid });
}
