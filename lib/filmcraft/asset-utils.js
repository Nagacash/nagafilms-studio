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
  return 'video';
}
