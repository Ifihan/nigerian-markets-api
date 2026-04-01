import { Hono } from 'hono';
import type { Bindings } from '../../types';
import { getCoverageSummary } from '../../lib/db';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const coverage = await getCoverageSummary(c.env.DB);
  return c.json({ success: true, data: coverage });
});

export default app;
