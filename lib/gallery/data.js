import itemsData from './items.json';
import frameMetaData from './frameMeta.json';
import { deriveFacets, FACET_KEYS, parseFilterParams } from './facets';

const TYPES = ['movie', 'series', 'music', 'commercial'];
const frameMeta = frameMetaData;

export const items = itemsData.items;
export const projects = itemsData.projects;
export const heroSlides = itemsData.heroSlides;
export const collections = itemsData.collections;

export function getAll() {
  return items.filter((i) => i.published && !i.locked);
}

export function getByType(type) {
  const t = normalizeType(type);
  if (!t) return getAll();
  return getAll().filter((i) => i.type === t);
}

export function getBySlug(slug) {
  return items.find((i) => i.slug === slug) || null;
}

export function search(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return getAll();
  return getAll().filter((i) => {
    const haystack = [i.title, i.director, i.cinematographer, i.country, ...(i.genres || []), i.type, String(i.year)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

function defaultFrameMeta(item, index) {
  return {
    palette: item.palette || [],
    tags: [...(item.genres || []), item.type].filter(Boolean),
    color: 'Mixed',
    intExt: 'Interior',
    timeOfDay: 'Night',
    aspectRatio: String(item.aspect || '1.78'),
    frameSize: index === 0 ? 'Medium Wide' : 'Medium',
    shotType: index === 0 ? 'Establishing' : 'Single',
    composition: 'Center',
    lighting: 'Motivated practicals',
    camera: 'Virtual · Cinema Studio',
    lenses: '35mm equivalent',
    actors: [],
  };
}

function buildScene(item, src, index, metaKey = item.slug) {
  const metaList = frameMeta[metaKey] || [];
  const meta = metaList[index] || defaultFrameMeta(item, index);

  return {
    id: `${metaKey}-${index}`,
    src,
    index,
    slug: item.slug,
    title: item.title,
    year: item.year,
    type: item.type,
    origin: item.origin === 'photo' ? 'photo' : 'ai',
    director: item.director,
    cinematographer: item.cinematographer,
    country: item.country,
    link: item.link || `/film/gallery/${item.slug}`,
    ...meta,
  };
}

export function getScenesForItem(itemOrSlug) {
  const item = typeof itemOrSlug === 'string' ? getBySlug(itemOrSlug) : itemOrSlug;
  if (!item) return [];

  const stills = item.stills?.length ? item.stills : [item.thumbUrl];
  return stills.map((src, index) => buildScene(item, src, index));
}

export function getAllScenes() {
  const fromItems = getAll().flatMap((item) => getScenesForItem(item));
  const seen = new Set(fromItems.map((scene) => scene.src));
  const fromCollections = collections.flatMap((col) => {
    if (col.itemSlugs?.length) return [];
    return getScenesForCollection(col.slug).filter((scene) => {
      if (seen.has(scene.src)) return false;
      seen.add(scene.src);
      return true;
    });
  });
  return [...fromItems, ...fromCollections];
}

export function searchScenes(query) {
  const q = (query || '').trim().toLowerCase();
  const scenes = getAllScenes();
  if (!q) return scenes;

  return scenes.filter((scene) => {
    const haystack = [
      scene.title,
      scene.director,
      scene.cinematographer,
      scene.country,
      scene.color,
      scene.intExt,
      scene.timeOfDay,
      scene.frameSize,
      scene.shotType,
      scene.lighting,
      scene.camera,
      scene.lenses,
      ...(scene.tags || []),
      ...(scene.actors || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterScenes(searchParams) {
  const params = parseFilterParams(searchParams);
  const scenes = params.search ? searchScenes(params.search) : getAllScenes();

  if (!FACET_KEYS.some((key) => params[key])) return scenes;

  return scenes.filter((scene) => {
    const facets = deriveFacets(scene);
    return FACET_KEYS.every((key) => !params[key] || facets[key] === params[key]);
  });
}

export function getScenesForCollection(slug) {
  const col = getCollectionBySlug(slug);
  if (!col) return [];

  if (col.itemSlugs?.length) {
    return col.itemSlugs.flatMap((itemSlug) => getScenesForItem(itemSlug));
  }

  const frames = col.frames || [];
  const pseudoItem = {
    slug: col.slug,
    title: col.title,
    year: new Date().getFullYear(),
    type: 'movie',
    origin: col.origin === 'photo' ? 'photo' : 'ai',
    director: col.creator,
    cinematographer: 'AI · Cinema Studio',
    country: 'Germany',
    palette: [],
    link: `/film/collection/${col.slug}`,
  };

  return frames.map((src, index) => buildScene(pseudoItem, src, index, col.slug));
}

export function getCollectionsByTab(tab) {
  if (!tab || tab === 'All') return collections;
  return collections.filter((c) => c.tab === tab);
}

export function getAllCollections() {
  return collections;
}

export function getCollectionBySlug(slug) {
  const col = collections.find((c) => c.slug === slug);
  if (!col) return null;

  let frames = col.frames || [];
  if (col.itemSlugs?.length) {
    frames = col.itemSlugs.flatMap((itemSlug) => {
      const item = getBySlug(itemSlug);
      return item?.stills?.length ? item.stills : item?.thumbUrl ? [item.thumbUrl] : [];
    });
  }

  return {
    ...col,
    frames,
    stills: frames.length || col.stills,
  };
}

// Map URL route segments (singular, hyphenated — matching the real stillslab.com)
// /movie, /series, /music-video, /commercial  ->  internal type
export function normalizeType(segment) {
  if (!segment) return null;
  const s = String(segment).toLowerCase();
  if (s === 'movie' || s === 'movies') return 'movie';
  if (s === 'series') return 'series';
  if (s === 'music-video' || s === 'music' || s === 'music_videos') return 'music';
  if (s === 'commercial' || s === 'commercials') return 'commercial';
  return null;
}

export function typeToSegment(type) {
  switch (type) {
    case 'movie': return 'movie';
    case 'series': return 'series';
    case 'music': return 'music-video';
    case 'commercial': return 'commercial';
    default: return null;
  }
}

export function typeLabel(type) {
  switch (type) {
    case 'movie': return 'Movies';
    case 'series': return 'Series';
    case 'music': return 'Music';
    case 'commercial': return 'Commercials';
    default: return 'All';
  }
}

export const TYPES_ORDER = TYPES;
