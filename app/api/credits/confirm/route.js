import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill';
import { getBalance } from '@/lib/credits';

export const runtime = 'nodejs';

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200),
});

/**
 * Client fallback after Checkout redirect.
 * Verifies the session with Stripe, then unlocks credits (idempotent with webhook).
 */
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.retrieve(parsed.data.sessionId);

    const ownerId = checkout.metadata?.userId || checkout.client_reference_id;
    if (!ownerId || ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Session does not belong to this user' }, { status: 403 });
    }

    const result = await fulfillCheckoutSession(checkout, { source: 'confirm' });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Could not unlock credits', ...result },
        { status: 400 }
      );
    }

    const balance = await getBalance(session.user.id);
    return NextResponse.json({ ...result, balance });
  } catch (err) {
    console.error('[credits/confirm]', err);
    return NextResponse.json({ error: err.message || 'Confirm failed' }, { status: 500 });
  }
}
