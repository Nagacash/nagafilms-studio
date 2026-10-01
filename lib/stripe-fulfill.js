import { creditFromStripeSession } from '@/lib/credits';
import { getPack } from '@/lib/packs';
import { notifyOrderUnlocked } from '@/lib/order-notify';

/**
 * Unlock credits from a paid Stripe Checkout Session (idempotent).
 * Shared by webhook + client confirm fallback.
 */
export async function fulfillCheckoutSession(session, { source = 'webhook' } = {}) {
  if (!session) {
    return { ok: false, error: 'Missing session' };
  }
  if (session.mode !== 'payment') {
    return { ok: true, skipped: true, reason: 'not_payment_mode' };
  }
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return { ok: false, error: 'Session not paid', paymentStatus: session.payment_status };
  }
  // Prefer paid; complete+unpaid should not credit
  if (session.payment_status !== 'paid') {
    return { ok: false, error: 'Session not paid', paymentStatus: session.payment_status };
  }

  const userId = session.metadata?.userId || session.client_reference_id;
  const packId = session.metadata?.packId;
  const pack = getPack(packId);
  const credits = Number(session.metadata?.credits || pack?.credits || 0);

  if (!userId || !credits) {
    return { ok: false, error: 'Invalid metadata', sessionId: session.id };
  }

  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id;

  const result = await creditFromStripeSession({
    userId,
    credits,
    stripeSessionId: session.id,
    paymentIntentId,
    packId,
  });

  const email =
    session.customer_details?.email ||
    session.customer_email ||
    null;

  await notifyOrderUnlocked({
    userId,
    email,
    credits,
    packId,
    amountTotal: session.amount_total,
    currency: session.currency,
    stripeSessionId: session.id,
    paymentIntentId,
    source,
    alreadyProcessed: result.alreadyProcessed,
  });

  return {
    ok: true,
    userId,
    credits,
    packId,
    stripeSessionId: session.id,
    ...result,
  };
}
