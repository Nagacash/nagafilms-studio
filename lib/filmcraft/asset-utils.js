export function extensionForUrl(url, kind = 'video') {
  try {
    const u = new URL(url);
    const parts = String(u.pathname || '').split('/').filter(Boolean);
    const base = parts[parts.length - 1] || 'clip';
    const ext = base.includes('.') ? base.split('.').pop() : '';
    if (ext && ext.length <= 5) return ext.toLowerCase();
  } catch {
    /* ignore */
  }
  if (kind === 'image') return 'png';
  if (kind === 'audio') return 'wav';
  return 'mp4';
}

export function firstResultUrl(row) {
  const urls = row?.resultUrls;
  if (Array.isArray(urls) && urls.length) return String(urls[0]);
  if (urls && typeof urls === 'object') {
    const vals = Object.values(urls).flat();
    if (vals.length) return String(vals[0]);
  }
  return null;
}

export function kindFromGeneration(row) {
  const m = String(row?.modality || '').toLowerCase();
  if (m === 'audio') return 'audio';
  if (m === 'image') return 'image';
  if (m === 'video') return 'video';

  // SaaS proxy often stores modality as "generation" — infer from URL / model.
  const url = firstResultUrl(row) || '';
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)) return 'image';
  if (/\.(mp3|wav|aac|flac|ogg|m4a)(\?|$)/i.test(url)) return 'audio';
  if (/\.(mp4|webm|mov|mkv|m4v)(\?|$)/i.test(url)) return 'video';

  const model = String(row?.model || '').toLowerCase();
  if (/(^|[-_/])(t2i|i2i|txt2img|img2img)([-_/]|$)/.test(model)) return 'image';
  if (/flux|sdxl|stable-diffusion|imagen|dall-?e|midjourney|ideogram|recraft/.test(model)) {
    return 'image';
  }
  if (/(^|[-_/])(t2v|i2v|v2v|txt2vid|img2vid)([-_/]|$)/.test(model)) return 'video';

  return 'video';
}
