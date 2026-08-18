const buckets = new Map();
const MAX_KEYS = 5000;

function prune(now) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.start >= bucket.windowMs) buckets.delete(key);
  }
  if (buckets.size >= MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest) buckets.delete(oldest);
  }
}

export function clientKey(req) {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/**
 * In-memory sliding window. Best-effort on serverless (per isolate).
 * @returns {{ ok: true } | { ok: false, retryAfter: number }}
 */
export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  prune(now);
  const prev = buckets.get(key);
  if (!prev || now - prev.start >= windowMs) {
    buckets.set(key, { start: now, count: 1, windowMs });
    return { ok: true };
  }
  prev.count += 1;
  if (prev.count > limit) {
    return { ok: false, retryAfter: Math.ceil((prev.windowMs - (now - prev.start)) / 1000) };
  }
  return { ok: true };
}

export function tooMany(retryAfter = 60) {
  return Response.json(
    { error: 'Too many requests. Try again shortly.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.max(1, retryAfter)) },
    }
  );
}
