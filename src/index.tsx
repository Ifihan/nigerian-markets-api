import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import type { Bindings } from '../types';
import { renderer } from './renderer';
import statesApi from './api/states';
import lgasApi from './api/lgas';
import marketsApi from './api/markets';
import contributeApi from './api/contribute';
import coverageApi from './api/coverage';
import { rateLimiter } from './middleware/rate-limit';
import { HomePage } from './pages/home';
import { DocsPage } from './pages/docs';
import { ContributePage } from './pages/contribute';
import { NotFoundPage } from './pages/not-found';
import { getMockMarketPulseData } from './data/mock-market-pulse';

const app = new Hono<{ Bindings: Bindings }>();

// Rate limiting
const contributeRateLimiter = rateLimiter({
  name: 'api-contribute',
  limit: 10,
  windowMs: 3_600_000,
});
const readRateLimiter = rateLimiter({
  name: 'api-read',
  limit: 60,
  windowMs: 60_000,
});

app.use('/api/contribute', contributeRateLimiter);
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET' || c.req.path === '/api/contribute') {
    await next();
    return;
  }

  return readRateLimiter(c, next);
});

// API middleware
app.use('/api/*', cors());
app.use(
  '/api/states/*',
  cache({ cacheName: 'iya-oloja', cacheControl: 'public, max-age=3600' })
);
app.use(
  '/api/lgas/*',
  cache({ cacheName: 'iya-oloja', cacheControl: 'public, max-age=3600' })
);
app.use(
  '/api/markets',
  cache({ cacheName: 'iya-oloja', cacheControl: 'public, max-age=300' })
);
app.use(
  '/api/coverage',
  cache({ cacheName: 'iya-oloja', cacheControl: 'public, max-age=300' })
);

// API index
app.get('/api', (c) => {
  return c.json({
    name: 'Iya Oloja',
    description: 'An open directory and API for markets across Nigeria',
    version: '1.1.0',
    endpoints: {
      states: '/api/states',
      state: '/api/states/:slug',
      lgas: '/api/lgas?state=:slug',
      lga: '/api/lgas/:slug',
      markets: '/api/markets?state=lagos&limit=20&offset=0&order=asc',
      coverage: '/api/coverage',
      contribute: 'POST /api/contribute',
    },
    docs: '/docs',
    github: 'https://github.com/ifihan/nigerian-markets-api',
  });
});

// API routes
app.route('/api/states', statesApi);
app.route('/api/lgas', lgasApi);
app.route('/api/markets', marketsApi);
app.route('/api/coverage', coverageApi);
app.route('/api/contribute', contributeApi);

// Pages
app.use('*', renderer);

app.get('/', async (c) => {
  if (c.req.query('mock') === '1') {
    const mock = getMockMarketPulseData();
    return c.render(
      <HomePage
        stateStats={mock.stateStats}
        totalMarkets={mock.totalMarkets}
        totalStates={mock.totalStates}
        statesWithMarkets={mock.statesWithMarkets}
        lgasWithData={mock.lgasWithData}
      />,
      { title: 'Iya Oloja — Nigerian Markets API' }
    );
  }

  const db = c.env.DB;

  // Fetch market counts per state
  const stateStats = await db
    .prepare(`
      SELECT s.slug, s.name, COUNT(m.id) as market_count,
             COUNT(DISTINCT l.id) as lga_with_markets
      FROM states s
      LEFT JOIN lgas l ON l.state_id = s.id
      LEFT JOIN markets m ON m.lga_id = l.id
      GROUP BY s.id
      ORDER BY market_count DESC
    `)
    .all<{ slug: string; name: string; market_count: number; lga_with_markets: number }>();

  // Totals
  const totalMarkets = await db.prepare('SELECT COUNT(*) as c FROM markets').first<{ c: number }>();
  const totalStates = stateStats.results?.length ?? 37;
  const statesWithMarkets = stateStats.results?.filter((s) => s.market_count > 0).length ?? 0;
  const totalLgasWithData = await db
    .prepare('SELECT COUNT(DISTINCT lga_id) as c FROM markets')
    .first<{ c: number }>();

  return c.render(
    <HomePage
      stateStats={stateStats.results ?? []}
      totalMarkets={totalMarkets?.c ?? 0}
      totalStates={totalStates}
      statesWithMarkets={statesWithMarkets}
      lgasWithData={totalLgasWithData?.c ?? 0}
    />,
    { title: 'Iya Oloja — Nigerian Markets API' }
  );
});

app.get('/docs', (c) => {
  if (c.env.DOCS_URL) {
    return c.redirect(c.env.DOCS_URL, 302);
  }
  return c.render(<DocsPage />, { title: 'Docs — Iya Oloja' });
});

app.get('/contribute', (c) => {
  return c.render(<ContributePage />, { title: 'Contribute — Iya Oloja' });
});

app.notFound((c) => {
  return c.render(<NotFoundPage />, { title: '404 — Iya Oloja' });
});

export default app;
