/**
 * Shared storyboard pricing (USD operator estimates → Naga credits via markup).
 *
 * MuAPI does not publish fixed storyboard step prices in OpenAPI. These USD
 * figures are operator estimates so SaaS holds and the Studio UI stay aligned.
 * Tune via env on the server; client uses the same defaults unless overridden.
 */

export const STORYBOARD_USD_ESTIMATES = {
  generateProjectBase: 0.75,
  generateProjectPerEpisode: 0.35,
  generateProjectProMult: 1.5,
  generateLibrary: 0.56,
  generateShotsBase: 0.5,
  generateShotsPerShot: 0.0625,
  generatePdf: 0.09,
  addEpisode: 0.44,
  addScene: 0.22,
  addShot: 0.16,
  regenShot: 0.125,
  regenCharacter: 0.19,
};

export function defaultPricingConfig() {
  return {
    creditsPerUsd: 100,
    markupMult: 1.6,
  };
}

/** @param {number} usd @param {{ creditsPerUsd?: number, markupMult?: number }} [cfg] */
export function usdToCredits(usd, cfg = defaultPricingConfig()) {
  if (usd == null || Number.isNaN(Number(usd))) return null;
  const perUsd = Number(cfg.creditsPerUsd ?? 100);
  const markup = Number(cfg.markupMult ?? 1.6);
  return Math.max(1, Math.ceil(Number(usd) * perUsd * markup));
}

/**
 * @param {string} step
 * @param {{ episodes?: number, shots?: number, usePro?: boolean }} [ctx]
 * @param {{ creditsPerUsd?: number, markupMult?: number }} [pricing]
 * @returns {{ credits: number, usd: number, label: string, note: string, approximate: boolean }}
 */
export function estimateStoryboardCredits(step, ctx = {}, pricing = defaultPricingConfig()) {
  const e = STORYBOARD_USD_ESTIMATES;
  const episodes = Math.max(1, Number(ctx.episodes) || 1);
  const shots = Math.max(0, Number(ctx.shots) || 0);
  const pro = Boolean(ctx.usePro);

  const pack = (usd, note) => {
    if (usd <= 0) {
      return {
        credits: 0,
        usd: 0,
        label: '0 cr',
        note,
        approximate: true,
      };
    }
    const credits = usdToCredits(usd, pricing);
    return {
      credits,
      usd,
      label: `~${credits} cr`,
      note,
      approximate: true,
    };
  };

  switch (step) {
    case 'generateProject': {
      let usd = e.generateProjectBase + e.generateProjectPerEpisode * episodes;
      if (pro) usd *= e.generateProjectProMult;
      return pack(
        usd,
        `${episodes} episode${episodes === 1 ? '' : 's'}${pro ? ' · Pro' : ''} · approx`,
      );
    }
    case 'blankProject':
      return pack(0, 'Shell only — generation billed later');
    case 'generateLibrary':
      return pack(e.generateLibrary, 'Character library pass · approx');
    case 'generateShots': {
      const assumed = Math.max(shots, episodes * 8);
      const usd = e.generateShotsBase + e.generateShotsPerShot * assumed;
      return pack(
        usd,
        shots
          ? `Based on ${shots} existing shots · approx`
          : `Rough estimate for ~${assumed} shots · approx`,
      );
    }
    case 'generatePdf':
      return pack(e.generatePdf, 'Consolidated PDF · approx');
    case 'addEpisode':
      return pack(e.addEpisode, 'AI episode insert · approx');
    case 'addScene':
      return pack(e.addScene, 'AI scene insert · approx');
    case 'addShot':
      return pack(e.addShot, 'AI shot insert · approx');
    case 'regenShot':
      return pack(e.regenShot, 'Single shot regen · approx');
    case 'regenCharacter':
      return pack(e.regenCharacter, 'Character regen · approx');
    default:
      return {
        credits: 0,
        usd: 0,
        label: '—',
        note: 'Unknown step',
        approximate: true,
      };
  }
}
