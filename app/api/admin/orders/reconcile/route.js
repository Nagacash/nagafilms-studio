import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/admin';
import { getStripe } from '@/lib/stripe';
import { fulfillCheckoutSession } from '@/lib/stripe-fulfill';
import { getBalance } from '@/lib/credits';

export const runtime = 'nodejs';

const bodySchema = z.object({
  sessionId: z.string().min(1).optional(),
  email: z.string().email().optional(),
  limit: z.number().int().min(1).max(50).default(20),
}).refine((d) => d.sessionId || d.email, { message: 'sessionId or email required' });

/**
 * Admin: re-run fulfill for paid Checkout sessions that never hit the webhook.
 */
export async function POST(req) {
  try {
    await requireAdmin();
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 });
    }

    const stripe = getStripe();
    const sessions = [];

    if (parsed.data.sessionId) {
      sessions.push(await stripe.checkout.sessions.retrieve(parsed.data.sessionId));
    } else {
      const listed = await stripe.checkout.sessions.list({ limit: parsed.data.limit });
      const email = parsed.data.email.trim().toLowerCase();
      for (const s of listed.data) {
        const e = (s.customer_details?.email || s.customer_email || '').toLowerCase();
        if (e === email && s.payment_status === 'paid') sessions.push(s);
      }
    }

    const results = [];
    for (const s of sessions) {
      const result = await fulfillCheckoutSession(s, { source: 'admin_reconcile' });
      let balance = null;
      if (result.userId) {
        try {
          balance = await getBalance(result.userId);
        } catch {
          /* ignore */
        }
      }
      results.push({ sessionId: s.id, paymentStatus: s.payment_status, balance, ...result });
    }

    return NextResponse.json({ ok: true, count: results.length, results });
  } catch (err) {
    const status = err.status || 500;
    return NextResponse.json({ error: err.message || 'Reconcile failed' }, { status });
  }
}
