import { NextResponse } from 'next/server';
import { getStudioModels, getStaticFallback, STUDIO_CATEGORIES } from '@/lib/model-catalog';
import { getPricingConfig } from '@/lib/pricing';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 't2i';

  if (!STUDIO_CATEGORIES[category]) {
    return NextResponse.json(
      { error: 'Invalid category', allowed: Object.keys(STUDIO_CATEGORIES) },
      { status: 400 }
    );
  }

  try {
    const catalog = await getStudioModels(category);
    return NextResponse.json({
      ...catalog,
      pricing: getPricingConfig(),
    });
  } catch (err) {
    console.error('[api/models]', err);
    const fallback = getStaticFallback(category);
    return NextResponse.json({
      ...fallback,
      pricing: getPricingConfig(),
      warning: 'Live catalog unavailable — showing cached static list',
    });
  }
}
