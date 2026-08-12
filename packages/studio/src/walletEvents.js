/** Broadcast wallet updates from API responses to the studio shell. */
export function emitWalletUpdate(detail) {
  if (typeof window === 'undefined' || !detail) return;
  window.dispatchEvent(new CustomEvent('naga:wallet', { detail }));
}

export function parseNagaWalletPayload(data) {
  if (!data?.naga) return null;
  return {
    phase: data.naga.phase || 'hold',
    costCredits: data.naga.costCredits,
    walletBalance: data.naga.walletBalance,
    restoredCredits: data.naga.restoredCredits,
    generationId: data.naga.generationId,
  };
}
