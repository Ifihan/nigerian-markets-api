import type { MiddlewareHandler } from 'hono';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const store = new Map<string, number[]>();
let requestCount = 0;

function pruneStore(windowMs: number) {
  const now = Date.now();
  for (const [key, timestamps] of store) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, valid);
    }
  }
}

function getClientIp(req: Request): string {
  return (
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}

export function rateLimiter(config: RateLimitConfig): MiddlewareHandler {
  const { limit, windowMs } = config;

  return async (c, next) => {
    const ip = getClientIp(c.req.raw);
    const now = Date.now();

    // Periodic cleanup every 100 requests
    requestCount++;
    if (requestCount % 100 === 0) {
      pruneStore(windowMs);
    }

    const timestamps = store.get(ip) || [];
    const valid = timestamps.filter((t) => now - t < windowMs);

    const resetTime = valid.length > 0 ? valid[0] + windowMs : now + windowMs;
    const resetSeconds = Math.ceil(resetTime / 1000);

    if (valid.length >= limit) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(limit));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(resetSeconds));
      return c.json(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded. Try again later.',
            code: 'RATE_LIMITED',
          },
        },
        429
      );
    }

    valid.push(now);
    store.set(ip, valid);

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - valid.length));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    await next();
  };
}
