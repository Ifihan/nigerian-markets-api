import { Hono } from 'hono';
import type { Bindings } from '../../types';
import { getMarkets } from '../../lib/db';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const limit = Math.min(Math.max(parseInt(c.req.query('limit') || '20'), 1), 100);
  const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);
  const order = c.req.query('order') === 'desc' ? 'desc' as const : 'asc' as const;
  const q = c.req.query('q')?.trim();
  const stateSlug = c.req.query('state')?.trim();
  const lgaSlug = c.req.query('lga')?.trim();

  if (q && q.length > 100) {
    return c.json({ success: false, error: { message: 'Query too long', code: 'BAD_REQUEST' } }, 400);
  }

  const { markets, total } = await getMarkets(c.env.DB, {
    limit,
    offset,
    order,
    q: q || undefined,
    stateSlug: stateSlug || undefined,
    lgaSlug: lgaSlug || undefined,
  });

  return c.json({
    success: true,
    data: markets,
    meta: { total, limit, offset },
  });
});

export default app;
