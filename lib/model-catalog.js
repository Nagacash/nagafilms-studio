import { usdToCredits } from '@/lib/pricing';
import {
  t2iModels,
  i2iModels,
  t2vModels,
  i2vModels,
  v2vModels,
  lipsyncModels,
} from '../packages/studio/src/models.js';

const MUAPI_MODELS_URL = 'https://api.muapi.ai/api/v1/models';
const CACHE_TTL_MS = 60 * 60 * 1000;

/** @type {{ fetchedAt: number, models: object[] } | null} */
let cache = null;

const STATIC_BY_ID = new Map();
for (const m of [
  ...t2iModels,
  ...i2iModels,
  ...t2vModels,
  ...i2vModels,
  ...v2vModels,
  ...lipsyncModels,
]) {
  STATIC_BY_ID.set(m.id, m);
}

export const STUDIO_CATEGORIES = {
  t2i: { muapi: 'Text to Image' },
  i2i: { muapi: 'Image to Image' },
  t2v: { muapi: 'Text to Video' },
  i2v: { muapi: 'Image to Video' },
  v2v: { muapi: 'Video to Video' },
  lipsync: {
    muapi: 'Audio to Video',
    filter: (m) =>
      /lip|sync|avatar|omnihuman|talk|infinitetalk|latent-sync|creatify|speech-to-video|wan2\.2-speech/i.test(
        `${m.name} ${m.description || ''}`
      ),
  },
};

function endpointSlug(endpoint) {
  if (!endpoint) return null;
  return endpoint.replace(/^\/api\/v1\//, '').replace(/^\//, '');
}

function titleCase(slug) {
  return slug
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function normalizeMuApiModel(raw) {
  const id = raw.name;
  const staticMeta = STATIC_BY_ID.get(id);
  const costUsd = raw.dynamic_pricing ? raw.cost ?? null : raw.cost ?? null;

  return {
    id,
    name: staticMeta?.name || titleCase(id),
    description: staticMeta?.description || raw.description || '',
    category: raw.category,
    family: raw.family || staticMeta?.family || null,
    costUsd,
    costCredits: usdToCredits(costUsd),
    dynamicPricing: Boolean(raw.dynamic_pricing),
    endpoint: endpointSlug(raw.endpoint) || id,
    estimateEndpoint: raw.estimate_endpoint || null,
    hasStaticMeta: Boolean(staticMeta),
  };
}

async function fetchLiveCatalog() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.models;
  }

  const res = await fetch(MUAPI_MODELS_URL, { next: { revalidate: 3600 } });
  if (!res.ok) {
    throw new Error(`MuAPI models fetch failed: ${res.status}`);
  }

  const data = await res.json();
  const models = (data.models || []).map(normalizeMuApiModel);
  cache = { fetchedAt: now, models };
  return models;
}

export async function getStudioModels(category) {
  const config = STUDIO_CATEGORIES[category];
  if (!config) {
    throw new Error(`Unknown category: ${category}`);
  }

  const all = await fetchLiveCatalog();
  let filtered = all.filter((m) => m.category === config.muapi);
  if (config.filter) filtered = filtered.filter(config.filter);

  filtered.sort((a, b) => a.name.localeCompare(b.name));

  return {
    category,
    models: filtered,
    total: filtered.length,
    cachedAt: cache?.fetchedAt ? new Date(cache.fetchedAt).toISOString() : null,
    source: 'muapi',
  };
}

/** Fallback when live catalog is unavailable — static lists only. */
export function getStaticFallback(category) {
  const map = {
    t2i: t2iModels,
    i2i: i2iModels,
    t2v: t2vModels,
    i2v: i2vModels,
    v2v: v2vModels,
    lipsync: lipsyncModels,
  };
  const list = map[category] || [];
  return {
    category,
    models: list.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description || '',
      category,
      family: m.family || null,
      costUsd: null,
      costCredits: null,
      dynamicPricing: false,
      endpoint: m.endpoint || m.id,
      estimateEndpoint: null,
      hasStaticMeta: true,
    })),
    total: list.length,
    cachedAt: null,
    source: 'static',
  };
}
