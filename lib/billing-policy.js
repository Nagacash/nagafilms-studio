/**
 * Naga Films billing policy (mirrors MuAPI’s model where it matters).
 *
 * Money (Stripe):
 * - Credit packs are one-time purchases.
 * - NO Stripe refunds for packs once payment succeeds (same idea as MuAPI:
 *   credit purchases are non-refundable — https://muapi.ai/refund-policy).
 * - We never call stripe.refunds.create for pack top-ups.
 *
 * App credits (our wallet):
 * - Hold credits when a generation / storyboard step starts.
 * - Capture (keep debit) only when status === completed.
 * - Restore credits only when generation failed/cancelled (not a cash refund).
 * - Hold/release/capture are idempotent via generations.held_credits.
 *
 * Storyboard (SaaS proxy):
 * - Billable POSTs hold estimated credits (USD table × markup).
 * - MuAPI webhook → /api/webhooks/muapi/storyboard settles the hold.
 * - Project GET is a backup settle path when webhooks are delayed.
 *
 * MuAPI (your server key):
 * - Marketing/docs: 0% charge on failed tasks; cost.refunded may become true.
 * - So a failed generation should not burn your MuAPI balance.
 * - Successful generations consume MuAPI credits (non-refundable once used).
 */

export const BILLING_POLICY = {
  packPurchasesRefundable: false,
  restoreAppCreditsOnGenerationFailure: true,
  stripeMoneyRefundOnFailure: false,
  storyboardHoldsViaProxy: true,
};
