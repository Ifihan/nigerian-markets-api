import { Hono } from 'hono';
import type { Bindings } from '../../types';
import { getStates, getStateBySlug } from '../../lib/db';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const states = await getStates(c.env.DB);
  return c.json({ success: true, data: states });
});

app.get('/:state', async (c) => {
  const slug = c.req.param('state');
  const includeLgas = c.req.query('include') === 'lgas';
  const state = await getStateBySlug(c.env.DB, slug, { includeLgas });

  if (!state) {
    return c.json({ success: false, error: { message: 'State not found', code: 'NOT_FOUND' } }, 404);
  }

  return c.json({ success: true, data: state });
});

export default app;
