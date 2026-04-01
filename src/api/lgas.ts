import { Hono } from 'hono';
import type { Bindings } from '../../types';
import { getLGABySlug, getLGAs } from '../../lib/db';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const stateSlug = c.req.query('state')?.trim();
  const lgas = await getLGAs(c.env.DB, { stateSlug: stateSlug || undefined });
  return c.json({ success: true, data: lgas });
});

app.get('/:lga', async (c) => {
  const slug = c.req.param('lga');
  const includeMarkets = c.req.query('include') === 'markets';
  const lga = await getLGABySlug(c.env.DB, slug, { includeMarkets });

  if (!lga) {
    return c.json({ success: false, error: { message: 'LGA not found', code: 'NOT_FOUND' } }, 404);
  }

  return c.json({ success: true, data: lga });
});

export default app;
