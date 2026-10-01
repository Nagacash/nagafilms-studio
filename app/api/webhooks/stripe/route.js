import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill';

export const runtime = 'nodejs';

export async function POST(req) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET not set' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    const rawBody = await req.text();
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error('[stripe webhook] signature', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const result = await fulfillCheckoutSession(session, { source: 'webhook' });

      if (!result.ok) {
        console.error('[stripe webhook] fulfill failed', session.id, result);
        return NextResponse.json({ error: result.error || 'Fulfill failed' }, { status: 400 });
      }

      console.log('[stripe webhook] credited', {
        sessionId: session.id,
        ...result,
      });
    }

    // Explicitly ignore refund / dispute events for auto-handling (manual review only)
    if (
      event.type === 'charge.refunded' ||
      event.type === 'charge.dispute.created'
    ) {
      console.warn('[stripe webhook] refund/dispute — no auto credit revoke', event.type, event.id);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook]', err);
    return NextResponse.json({ error: err.message || 'Handler failed' }, { status: 500 });
  }
}
