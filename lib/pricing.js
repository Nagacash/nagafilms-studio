/** Convert MuAPI USD cost to Naga credits (markup included). */
export function usdToCredits(usd) {
  if (usd == null || Number.isNaN(Number(usd))) return null;
  const perUsd = Number(process.env.CREDITS_PER_USD || 100);
  const markup = Number(process.env.MARKUP_MULT || 1.6);
  return Math.max(1, Math.ceil(Number(usd) * perUsd * markup));
}

export function getPricingConfig() {
  return {
    creditsPerUsd: Number(process.env.CREDITS_PER_USD || 100),
    markupMult: Number(process.env.MARKUP_MULT || 1.6),
  };
}

export function formatCreditLabel(model) {
  if (model?.dynamicPricing) {
    if (model.costCredits != null) return `from ~${model.costCredits} cr`;
    return 'dynamic pricing';
  }
  if (model?.costCredits != null) return `${model.costCredits} cr`;
  return null;
}
