/**
 * In-memory IP-based rate limiter.
 * Works within a single Edge/Node isolate. For production at scale,
 * replace with an external store (e.g. Upstash Redis).
 */

interface Entry {
  count: number;
  resetAt: number;
}

const cache = new Map<string, Entry>();

export function checkRateLimit(
  ip: string,
  limit = 15,
  windowMs = 60_000
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = cache.get(ip);

  if (!entry || entry.resetAt < now) {
    cache.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}
