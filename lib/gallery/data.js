import itemsData from './items.json';

const TYPES = ['movie', 'series', 'music', 'commercial'];

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

export function getCollectionsByTab(tab) {
  if (!tab || tab === 'All') return collections;
  return collections.filter((c) => c.tab === tab);
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
