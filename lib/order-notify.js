import { getAdminEmails } from '@/lib/admin';

/**
 * Fire-and-forget owner alert after a pack purchase unlocks.
 * Supports Discord/Slack-style incoming webhooks via ORDER_NOTIFY_WEBHOOK_URL.
 * Also logs so Vercel log drains catch it when no webhook is set.
 */
export async function notifyOrderUnlocked({
  userId,
  email,
  credits,
  packId,
  amountTotal,
  currency,
  stripeSessionId,
  paymentIntentId,
  source,
  alreadyProcessed,
}) {
  const payload = {
    type: 'credit_pack_unlocked',
    userId,
    email: email || null,
    credits,
    packId: packId || null,
    amountTotal: amountTotal ?? null,
    currency: currency || null,
    stripeSessionId,
    paymentIntentId: paymentIntentId || null,
    source: source || 'webhook',
    alreadyProcessed: Boolean(alreadyProcessed),
    admins: getAdminEmails(),
    at: new Date().toISOString(),
  };

  console.log('[order-notify]', JSON.stringify(payload));

  if (alreadyProcessed) return { skipped: true };

  const webhookUrl = process.env.ORDER_NOTIFY_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    console.warn(
      '[order-notify] ORDER_NOTIFY_WEBHOOK_URL not set — order unlock only logged'
    );
    return { notified: false, reason: 'no_webhook' };
  }

  const text = [
    `Naga Films pack unlocked`,
    email ? `Customer: ${email}` : `User: ${userId}`,
    `Credits: +${credits}${packId ? ` (${packId})` : ''}`,
    amountTotal != null
      ? `Paid: ${((Number(amountTotal) || 0) / 100).toFixed(2)} ${(currency || 'usd').toUpperCase()}`
      : null,
    `Session: ${stripeSessionId}`,
    paymentIntentId ? `PI: ${paymentIntentId}` : null,
    `Via: ${source}`,
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: text,
        text,
        username: 'Naga Films Orders',
      }),
    });
    if (!res.ok) {
      console.error('[order-notify] webhook HTTP', res.status, await res.text().catch(() => ''));
      return { notified: false, status: res.status };
    }
    return { notified: true };
  } catch (err) {
    console.error('[order-notify] webhook failed', err.message);
    return { notified: false, error: err.message };
  }
}
