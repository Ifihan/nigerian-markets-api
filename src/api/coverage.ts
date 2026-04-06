import { Hono } from 'hono';
import { getCoverageSummary } from '../../lib/db';
import type { Bindings } from '../../types';

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  const coverage = await getCoverageSummary(c.env.DB);
  return c.json({ success: true, data: coverage });
});

export default app;
