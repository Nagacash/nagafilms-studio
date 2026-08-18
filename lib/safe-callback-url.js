const AUTH_PAGES = new Set(['/login', '/signup']);

/**
 * Keep post-login redirects on-site. Rejects protocol-relative and off-site URLs.
 */
export function safeCallbackUrl(raw, fallback = '/studio') {
  const value = String(raw || '').trim();
  if (!value.startsWith('/') || value.startsWith('//')) return fallback;

  const path = value.split('?')[0].split('#')[0];
  if (AUTH_PAGES.has(path)) return fallback;

  return value;
}
