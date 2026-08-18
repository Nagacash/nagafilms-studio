import { handlers } from '@/lib/auth';
import { clientKey, rateLimit, tooMany } from '@/lib/rate-limit';

export const GET = handlers.GET;

export async function POST(req) {
  const limited = rateLimit(`auth:${clientKey(req)}`, { limit: 12, windowMs: 15 * 60 * 1000 });
  if (!limited.ok) return tooMany(limited.retryAfter);
  return handlers.POST(req);
}
