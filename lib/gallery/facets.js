export const FILTER_PATH = '/film/filter';
export const FACET_KEYS = ['size', 'shot', 'color', 'ie', 'tod'];

export const FACET_DEFS = [
  {
    key: 'size',
    label: 'Frame size',
    options: [
      { value: 'wide', label: 'Wide' },
      { value: 'medium-wide', label: 'Medium Wide' },
      { value: 'medium', label: 'Medium' },
      { value: 'medium-close-up', label: 'Medium Close-up' },
      { value: 'close-up', label: 'Close-up' },
    ],
  },
  {
    key: 'shot',
    label: 'Shot type',
    options: [
      { value: 'establishing', label: 'Establishing' },
      { value: 'single', label: 'Single' },
      { value: 'insert', label: 'Insert' },
      { value: 'pov', label: 'POV' },
      { value: '2-shot', label: '2 shot' },
      { value: 'product-hero', label: 'Product hero' },
    ],
  },
  {
    key: 'color',
    label: 'Color',
    options: [
      { value: 'cool', label: 'Cool' },
      { value: 'warm', label: 'Warm' },
      { value: 'neutral', label: 'Neutral' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'bw', label: 'B&W' },
    ],
  },
  {
    key: 'ie',
    label: 'Int / Ext',
    options: [
      { value: 'interior', label: 'Interior' },
      { value: 'exterior', label: 'Exterior' },
    ],
  },
  {
    key: 'tod',
    label: 'Time of day',
    options: [
      { value: 'day', label: 'Day' },
      { value: 'night', label: 'Night' },
    ],
  },
];

const ALLOWED = Object.fromEntries(
  FACET_DEFS.map((group) => [group.key, new Set(group.options.map((o) => o.value))])
);

const META_TO_FACET = {
  Color: 'color',
  'Int/Ext': 'ie',
  'Time of Day': 'tod',
  'Frame Size': 'size',
  'Shot Type': 'shot',
};

export function slugFacet(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function firstParam(value) {
  if (Array.isArray(value)) return String(value[0] || '').trim();
  return String(value || '').trim();
}

function colorKey(color) {
  const raw = String(color || '').trim();
  if (/black\s*&\s*white/i.test(raw) || slugFacet(raw) === 'black-white') return 'bw';
  const first = raw.split(',')[0].trim().toLowerCase();
  if (ALLOWED.color.has(first)) return first;
  return '';
}

export function deriveFacets(scene) {
  return {
    size: slugFacet(scene?.frameSize),
    shot: slugFacet(scene?.shotType),
    color: colorKey(scene?.color),
    ie: slugFacet(scene?.intExt),
    tod: slugFacet(scene?.timeOfDay),
  };
}

export function parseFilterParams(searchParams) {
  const raw = searchParams || {};
  const params = { search: firstParam(raw.search) };

  for (const key of FACET_KEYS) {
    const value = slugFacet(firstParam(raw[key]));
    params[key] = ALLOWED[key].has(value) ? value : '';
  }

  return params;
}

export function filterHref(params = {}) {
  const sp = new URLSearchParams();
  const search = String(params.search || '').trim();
  if (search) sp.set('search', search);

  for (const key of FACET_KEYS) {
    const value = slugFacet(params[key]);
    if (ALLOWED[key].has(value)) sp.set(key, value);
  }

  const query = sp.toString();
  return query ? `${FILTER_PATH}?${query}` : FILTER_PATH;
}

export function toggleFacetHref(current, key, value) {
  const next = { ...current };
  next[key] = current[key] === value ? '' : value;
  return filterHref(next);
}

export function sceneFacetHref(scene, label) {
  const key = META_TO_FACET[label];
  if (!key) return null;
  const value = deriveFacets(scene)[key];
  if (!value || !ALLOWED[key].has(value)) return null;
  return filterHref({ [key]: value });
}

export function getPresentFacetGroups(scenes) {
  const present = Object.fromEntries(FACET_KEYS.map((key) => [key, new Set()]));

  for (const scene of scenes) {
    const facets = deriveFacets(scene);
    for (const key of FACET_KEYS) {
      if (facets[key]) present[key].add(facets[key]);
    }
  }

  return FACET_DEFS
    .map((group) => ({
      ...group,
      options: group.options.filter((option) => present[group.key].has(option.value)),
    }))
    .filter((group) => group.options.length > 0);
}

export function hasActiveFacets(params) {
  return FACET_KEYS.some((key) => params?.[key]);
}
