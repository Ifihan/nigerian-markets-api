import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import type { Bindings } from '../types';
import { renderer } from './renderer';
import searchApi from './api/search';
import statesApi from './api/states';
import lgasApi from './api/lgas';
import marketsApi from './api/markets';
import contributeApi from './api/contribute';
import { HomePage } from './pages/home';
import { DocsPage } from './pages/docs';
import { ContributePage } from './pages/contribute';
import { NotFoundPage } from './pages/not-found';

const app = new Hono<{ Bindings: Bindings }>();

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

// API index
app.get('/api', (c) => {
  return c.json({
    name: 'Iya Oloja',
    description: 'An open directory and API for markets across Nigeria',
    version: '1.0.0',
    endpoints: {
      states: '/api/states',
      state: '/api/states/:slug',
      lgas: '/api/lgas/:slug',
      markets: '/api/markets?limit=20&offset=0&order=asc',
      search: '/api/search?q=query',
      contribute: 'POST /api/contribute',
    },
    docs: '/docs',
    github: 'https://github.com/ifihan/nigerian-markets-api',
  });
});

// API routes
app.route('/api/search', searchApi);
app.route('/api/states', statesApi);
app.route('/api/lgas', lgasApi);
app.route('/api/markets', marketsApi);
app.route('/api/contribute', contributeApi);

// Pages
app.use('*', renderer);

app.get('/', (c) => {
  return c.render(<HomePage />, { title: 'Iya Oloja — Nigerian Markets API' });
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
