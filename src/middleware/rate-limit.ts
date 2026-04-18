import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../../types';

interface RateLimitConfig {
  name: string;
  limit: number;
  windowMs: number;
}

let schemaReady: Promise<void> | null = null;

function getClientIp(req: Request): string | null {
  return (
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  );
}

async function ensureRateLimitSchema(db: D1Database) {
  if (!schemaReady) {
    schemaReady = db
      .exec(`
        CREATE TABLE IF NOT EXISTS rate_limit_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          policy TEXT NOT NULL,
          client_key TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_rate_limit_policy_key_time
          ON rate_limit_events(policy, client_key, created_at);
      `)
      .then(() => undefined)
      .catch((error) => {
        schemaReady = null;
        throw error;
      });
  }

  await schemaReady;
}

export function rateLimiter(
  config: RateLimitConfig
): MiddlewareHandler<{ Bindings: Bindings }> {
  const { name, limit, windowMs } = config;

  return async (c, next) => {
    const ip = getClientIp(c.req.raw);
    if (!ip) {
      await next();
      return;
    }

    const db = c.env.DB;
    const now = Date.now();
    const cutoff = now - windowMs;

    await ensureRateLimitSchema(db);

    await db
      .prepare(
        `DELETE FROM rate_limit_events
         WHERE policy = ? AND client_key = ? AND created_at <= ?`
      )
      .bind(name, ip, cutoff)
      .run();

    const usage = await db
      .prepare(
        `SELECT COUNT(*) as total, MIN(created_at) as oldest
         FROM rate_limit_events
         WHERE policy = ? AND client_key = ?`
      )
      .bind(name, ip)
      .first<{ total: number; oldest: number | null }>();

    const total = usage?.total ?? 0;
    const oldest = usage?.oldest;
    const resetTime = oldest ? oldest + windowMs : now + windowMs;
    const resetSeconds = Math.ceil(resetTime / 1000);

    if (total >= limit) {
      const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));
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

    await db
      .prepare(
        `INSERT INTO rate_limit_events (policy, client_key, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(name, ip, now)
      .run();

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - total - 1));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    await next();
  };
}
