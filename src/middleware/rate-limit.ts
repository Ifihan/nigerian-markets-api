import type { MiddlewareHandler } from 'hono';
import type { Bindings } from '../../types';

interface RateLimitConfig {
  name: string;
  limit: number;
  windowMs: number;
}

function getClientIp(req: Request): string | null {
  return (
    req.headers.get('CF-Connecting-IP') ||
    req.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  );
}

const policyWindows = new Map<string, number>();

// Global prune counter shared across all rateLimiter instances in the isolate.
// Periodically deletes expired rows for all policies/IPs to prevent unbounded growth.
let globalRequestCount = 0;

async function pruneExpiredRows(db: D1Database) {
  const now = Date.now();

  for (const [policy, windowMs] of policyWindows) {
    const cutoff = now - windowMs;
    await db
      .prepare(
        `DELETE FROM rate_limit_events
         WHERE policy = ? AND created_at <= ?`
      )
      .bind(policy, cutoff)
      .run();
  }
}

export function rateLimiter(
  config: RateLimitConfig
): MiddlewareHandler<{ Bindings: Bindings }> {
  const { name, limit, windowMs } = config;
  let schemaReady: Promise<void> | null = null;
  policyWindows.set(name, windowMs);

  async function ensureRateLimitSchema(db: D1Database) {
    if (!schemaReady) {
      schemaReady = db
        .prepare(
          `CREATE TABLE IF NOT EXISTS rate_limit_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            policy TEXT NOT NULL,
            client_key TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )`
        )
        .run()
        .then(() =>
          db
            .prepare(
              `CREATE INDEX IF NOT EXISTS idx_rate_limit_policy_key_time
               ON rate_limit_events(policy, client_key, created_at)`
            )
            .run()
        )
        .then(() => undefined)
        .catch((error) => {
          schemaReady = null;
          throw error;
        });
    }
    await schemaReady;
  }

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

    // Periodic global prune every 500 requests to prevent unbounded table growth.
    // Each policy is pruned using its own retention window.
    globalRequestCount++;
    if (globalRequestCount % 500 === 0) {
      await pruneExpiredRows(db);
    }

    // Atomic check-and-insert: insert the event unconditionally, then count
    // within the window. If the count exceeds the limit, delete the just-inserted
    // row and reject. This avoids the TOCTOU race of separate check/insert steps.
    await db
      .prepare(
        `INSERT INTO rate_limit_events (policy, client_key, created_at)
         VALUES (?, ?, ?)`
      )
      .bind(name, ip, now)
      .run();

    const usage = await db
      .prepare(
        `SELECT COUNT(*) as total, MIN(created_at) as oldest
         FROM rate_limit_events
         WHERE policy = ? AND client_key = ? AND created_at > ?`
      )
      .bind(name, ip, cutoff)
      .first<{ total: number; oldest: number | null }>();

    const total = usage?.total ?? 1;
    const oldest = usage?.oldest ?? now;
    const resetTime = oldest + windowMs;
    const resetSeconds = Math.ceil(resetTime / 1000);

    if (total > limit) {
      // Roll back the insert so the slot is not consumed on a rejected request.
      await db
        .prepare(
          `DELETE FROM rate_limit_events
           WHERE policy = ? AND client_key = ? AND created_at = ? AND
                 id = (SELECT MAX(id) FROM rate_limit_events
                       WHERE policy = ? AND client_key = ? AND created_at = ?)`
        )
        .bind(name, ip, now, name, ip, now)
        .run();

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

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(limit - total));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    await next();
  };
}
