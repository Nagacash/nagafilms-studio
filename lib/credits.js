import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb, schema } from './db';
import { usdToCredits } from './pricing';

const { creditWallets, creditTransactions, generations } = schema;

export async function ensureWallet(userId) {
  const db = getDb();
  const existing = await db.query.creditWallets.findFirst({
    where: eq(creditWallets.userId, userId),
  });
  if (existing) return existing;
  const [row] = await db
    .insert(creditWallets)
    .values({ userId, balance: 0 })
    .onConflictDoNothing()
    .returning();
  if (row) return row;
  return db.query.creditWallets.findFirst({
    where: eq(creditWallets.userId, userId),
  });
}

export async function getBalance(userId) {
  const wallet = await ensureWallet(userId);
  return wallet?.balance ?? 0;
}

/** Idempotent pack unlock after Stripe Checkout */
export async function creditFromStripeSession({
  userId,
  credits,
  stripeSessionId,
  paymentIntentId,
  packId,
}) {
  const db = getDb();
  await ensureWallet(userId);

  try {
    await db.insert(creditTransactions).values({
      userId,
      amount: credits,
      reason: 'topup',
      stripeSessionId,
      stripePaymentIntentId: paymentIntentId || null,
      metadata: { packId },
    });
  } catch (err) {
    if (
      String(err?.message || err).includes('credit_tx_stripe_session_uniq') ||
      String(err?.code) === '23505'
    ) {
      return { alreadyProcessed: true };
    }
    throw err;
  }

  await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} + ${credits}`,
      updatedAt: new Date(),
    })
    .where(eq(creditWallets.userId, userId));

  return { alreadyProcessed: false, credited: credits };
}

/** Hold credits before calling MuAPI (atomic). Returns false if insufficient. */
export async function holdCredits(userId, amount, generationId) {
  if (amount <= 0) return true;
  const db = getDb();
  await ensureWallet(userId);

  const updated = await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} - ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(eq(creditWallets.userId, userId), gte(creditWallets.balance, amount)))
    .returning();

  if (!updated.length) return false;

  await db.insert(creditTransactions).values({
    userId,
    amount: -amount,
    reason: 'generation',
    generationId,
    metadata: { hold: true },
  });

  return true;
}

/**
 * Restore held credits after failure. Idempotent via heldCredits gate —
 * concurrent release/capture cannot double-credit the wallet.
 */
export async function releaseHold(userId, amount, generationId) {
  if (!generationId) return { released: false };
  const db = getDb();

  const [row] = await db
    .select()
    .from(generations)
    .where(eq(generations.id, generationId))
    .limit(1);

  if (!row || row.heldCredits <= 0) return { released: false };

  const toRestore =
    Number(amount) > 0 ? Number(amount) : Number(row.heldCredits) || 0;
  if (toRestore <= 0) return { released: false };

  // Claim the hold atomically so a parallel capture/release cannot double-restore.
  const cleared = await db
    .update(generations)
    .set({ heldCredits: 0 })
    .where(and(eq(generations.id, generationId), gte(generations.heldCredits, 1)))
    .returning();

  if (!cleared.length) return { released: false };

  await db
    .update(creditWallets)
    .set({
      balance: sql`${creditWallets.balance} + ${toRestore}`,
      updatedAt: new Date(),
    })
    .where(eq(creditWallets.userId, userId));

  // App-credit restore only — NEVER a Stripe money refund.
  await db.insert(creditTransactions).values({
    userId,
    amount: toRestore,
    reason: 'generation_failed',
    generationId,
    metadata: { restoredCredits: true, stripeRefund: false },
  });

  return { released: true, amount: toRestore };
}

/** Mark hold as captured (debit kept). Idempotent. */
export async function captureHold(generationId) {
  if (!generationId) return { captured: false };
  const db = getDb();
  const updated = await db
    .update(generations)
    .set({ heldCredits: 0 })
    .where(and(eq(generations.id, generationId), gte(generations.heldCredits, 1)))
    .returning();
  return { captured: updated.length > 0 };
}

/**
 * Model-aware image credit estimate (live MuAPI catalog when available).
 * Falls back to DEFAULT_IMAGE_USD_COST × markup.
 */
export async function estimateImageCredits({ model } = {}) {
  const fallbackUsd = Number(process.env.DEFAULT_IMAGE_USD_COST || 0.04);

  if (model) {
    try {
      const { getModelPricing } = await import('./model-catalog');
      const priced = await getModelPricing(model);
      if (priced?.costCredits != null) return priced.costCredits;
      if (priced?.costUsd != null) {
        const c = usdToCredits(priced.costUsd);
        if (c != null) return c;
      }
    } catch (err) {
      console.warn('[credits] model pricing lookup failed', err.message);
    }
  }

  return usdToCredits(fallbackUsd) ?? 1;
}
