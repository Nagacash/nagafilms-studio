import { getAdminEmails } from '@/lib/admin';

const DEFAULT_NOTIFY_EMAIL = 'chosenfewrecords@hotmail.de';

function getNotifyEmails() {
  const raw = process.env.ORDER_NOTIFY_EMAIL?.trim();
  if (raw) {
    return raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  }
  const admins = getAdminEmails();
  if (admins.length) return admins;
  return [DEFAULT_NOTIFY_EMAIL];
}

function buildOrderText({
  email,
  userId,
  credits,
  packId,
  amountTotal,
  currency,
  stripeSessionId,
  paymentIntentId,
  source,
}) {
  return [
    'Naga Films — credit pack unlocked',
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
}

async function sendResendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { sent: false, reason: 'no_resend_key' };
  }

  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Naga Films <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
    }),
    signal: AbortSignal.timeout(8000),
  });

  const body = await res.text().catch(() => '');
  if (!res.ok) {
    console.error('[order-notify] resend HTTP', res.status, body);
    return { sent: false, status: res.status, body };
  }
  return { sent: true };
}

/**
 * Owner alert after a pack unlocks.
 * Emails ORDER_NOTIFY_EMAIL (default chosenfewrecords@hotmail.de) via Resend.
 * Optional ORDER_NOTIFY_WEBHOOK_URL still supported (Discord/Slack).
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
    notifyEmails: getNotifyEmails(),
    at: new Date().toISOString(),
  };

  console.log('[order-notify]', JSON.stringify(payload));

  if (alreadyProcessed) return { skipped: true };

  const text = buildOrderText({
    email,
    userId,
    credits,
    packId,
    amountTotal,
    currency,
    stripeSessionId,
    paymentIntentId,
    source: source || 'webhook',
  });

  const subject = `Naga Films order: +${credits} credits${email ? ` — ${email}` : ''}`;
  const to = getNotifyEmails();

  let emailResult = { sent: false, reason: 'not_attempted' };
  try {
    emailResult = await sendResendEmail({ to, subject, text });
    if (emailResult.reason === 'no_resend_key') {
      console.warn(
        '[order-notify] RESEND_API_KEY not set — cannot email',
        to.join(', ')
      );
    }
  } catch (err) {
    console.error('[order-notify] email failed', err.message);
    emailResult = { sent: false, error: err.message };
  }

  // Optional legacy Discord/Slack hook
  const webhookUrl = process.env.ORDER_NOTIFY_WEBHOOK_URL?.trim();
  let webhookResult = { notified: false, skipped: true };
  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          text,
          username: 'Naga Films Orders',
        }),
        signal: AbortSignal.timeout(5000),
      });
      webhookResult = res.ok
        ? { notified: true }
        : { notified: false, status: res.status };
    } catch (err) {
      webhookResult = { notified: false, error: err.message };
    }
  }

  return {
    notified: Boolean(emailResult.sent || webhookResult.notified),
    email: emailResult,
    webhook: webhookResult,
    to,
  };
}
