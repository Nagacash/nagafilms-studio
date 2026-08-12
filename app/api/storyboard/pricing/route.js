import { getPricingConfig } from '@/lib/pricing';
import {
  STORYBOARD_USD_ESTIMATES,
  estimateStoryboardCredits,
} from '@/lib/storyboard-pricing';

/** Public pricing sheet so Studio estimates match server holds. */
export async function GET() {
  const pricing = getPricingConfig();
  const steps = [
    'generateProject',
    'generateLibrary',
    'generateShots',
    'generatePdf',
    'addEpisode',
    'addScene',
    'addShot',
    'regenShot',
    'regenCharacter',
  ];
  const sample = Object.fromEntries(
    steps.map((step) => [
      step,
      estimateStoryboardCredits(
        step,
        { episodes: 1, shots: 8, usePro: false },
        pricing
      ),
    ])
  );

  return Response.json({
    pricing,
    usdEstimates: STORYBOARD_USD_ESTIMATES,
    sample,
    note: 'USD figures are operator estimates (MuAPI OpenAPI has no fixed storyboard prices). Credits = ceil(usd × creditsPerUsd × markupMult). Scripts are not offered.',
  });
}
