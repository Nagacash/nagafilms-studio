const PRIVATE_V4 = [
  ['0.0.0.0', '0.255.255.255'],
  ['10.0.0.0', '10.255.255.255'],
  ['127.0.0.0', '127.255.255.255'],
  ['169.254.0.0', '169.254.255.255'],
  ['172.16.0.0', '172.31.255.255'],
  ['192.168.0.0', '192.168.255.255'],
];

const BLOCKED_HOSTS = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata.goog',
  'kubernetes.default.svc',
]);

const UPLOAD_HOST_SUFFIXES = [
  'amazonaws.com',
  'amazoncognito.com',
  'cloudfront.net',
  'googleapis.com',
  'googleusercontent.com',
  'storage.googleapis.com',
  'r2.cloudflarestorage.com',
  'muapi.ai',
];

function ipv4ToInt(host) {
  const parts = host.split('.');
  if (parts.length !== 4) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
  return (((nums[0] << 24) >>> 0) + (nums[1] << 16) + (nums[2] << 8) + nums[3]) >>> 0;
}

function isPrivateIpv4(host) {
  const n = ipv4ToInt(host);
  if (n == null) return false;
  return PRIVATE_V4.some(([a, b]) => {
    const lo = ipv4ToInt(a);
    const hi = ipv4ToInt(b);
    return n >= lo && n <= hi;
  });
}

function hostAllowed(hostname, suffixes) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  return suffixes.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

/**
 * Reject URLs that can be used for SSRF (private hosts, non-https, credentials).
 * @returns {{ ok: true, url: URL } | { ok: false, error: string }}
 */
export function parsePublicHttpsUrl(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || '').trim());
  } catch {
    return { ok: false, error: 'Invalid URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'URL must be HTTPS' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, error: 'URL credentials are not allowed' };
  }
  if (parsed.port && parsed.port !== '443') {
    return { ok: false, error: 'URL port is not allowed' };
  }

  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, error: 'URL host is not allowed' };
  }
  if (host.includes(':') || isPrivateIpv4(host)) {
    return { ok: false, error: 'URL host is not allowed' };
  }

  return { ok: true, url: parsed };
}

export function assertUploadTargetUrl(raw) {
  const parsed = parsePublicHttpsUrl(raw);
  if (!parsed.ok) return parsed;
  if (!hostAllowed(parsed.url.hostname, UPLOAD_HOST_SUFFIXES)) {
    return { ok: false, error: 'Upload host is not allowed' };
  }
  return parsed;
}

export function assertWebhookUrl(raw) {
  return parsePublicHttpsUrl(raw);
}

export const SSRF_FETCH = { redirect: 'error', cache: 'no-store' };
