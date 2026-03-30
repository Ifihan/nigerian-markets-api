import { Hono } from 'hono';
import type { Bindings } from '../../types';

const app = new Hono<{ Bindings: Bindings }>();

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

app.post('/', async (c) => {
  const body = await c.req.json<{
    market_name: string;
    state: string;
    lga: string;
    lat?: number;
    lng?: number;
    description?: string;
    contributor_name?: string;
  }>();

  const marketName = body.market_name?.trim();
  const stateInput = body.state?.trim();
  const lgaInput = body.lga?.trim();

  if (!marketName || !stateInput || !lgaInput) {
    return c.json(
      { success: false, error: { message: 'market_name, state, and lga are required', code: 'BAD_REQUEST' } },
      400
    );
  }

  const db = c.env.DB;

  // Validate state exists
  const state = await db
    .prepare('SELECT id, name FROM states WHERE LOWER(name) = LOWER(?) OR slug = ?')
    .bind(stateInput, slugify(stateInput))
    .first<{ id: number; name: string }>();

  if (!state) {
    return c.json(
      { success: false, error: { message: `State "${stateInput}" not found`, code: 'INVALID_STATE' } },
      400
    );
  }

  // Validate LGA exists under that state
  const lga = await db
    .prepare('SELECT id, name FROM lgas WHERE state_id = ? AND (LOWER(name) = LOWER(?) OR slug = ?)')
    .bind(state.id, lgaInput, slugify(lgaInput))
    .first<{ id: number; name: string }>();

  if (!lga) {
    return c.json(
      { success: false, error: { message: `LGA "${lgaInput}" not found in ${state.name}`, code: 'INVALID_LGA' } },
      400
    );
  }

  if (!normalizeText(marketName).includes(normalizeText(lga.name))) {
    return c.json(
      {
        success: false,
        error: {
          message: `Market name must include the LGA name "${lga.name}"`,
          code: 'INVALID_MARKET_NAME',
        },
      },
      400
    );
  }

  const marketSlug = slugify(marketName);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(marketSlug)) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Market name cannot be converted into a valid slug',
          code: 'INVALID_MARKET_SLUG',
        },
      },
      400
    );
  }

  const duplicateSlug = await db
    .prepare('SELECT id FROM markets WHERE slug = ?')
    .bind(marketSlug)
    .first();

  if (duplicateSlug) {
    return c.json(
      {
        success: false,
        error: {
          message: `A market with the slug "${marketSlug}" already exists`,
          code: 'DUPLICATE_MARKET_SLUG',
        },
      },
      409
    );
  }

  // Check for duplicate market name in this LGA
  const existing = await db
    .prepare('SELECT id FROM markets WHERE lga_id = ? AND LOWER(name) = LOWER(?)')
    .bind(lga.id, marketName)
    .first();

  if (existing) {
    return c.json(
      { success: false, error: { message: `A market named "${marketName}" already exists in ${lga.name}, ${state.name}`, code: 'DUPLICATE_MARKET' } },
      409
    );
  }

  const hasLat = body.lat !== undefined && body.lat !== null;
  const hasLng = body.lng !== undefined && body.lng !== null;

  if (hasLat !== hasLng) {
    return c.json(
      {
        success: false,
        error: {
          message: 'Both lat and lng must be provided together',
          code: 'INVALID_COORDINATES',
        },
      },
      400
    );
  }

  // Validate coordinates are numbers and fall within Nigeria if provided
  if (hasLat && hasLng) {
    if (typeof body.lat !== 'number' || Number.isNaN(body.lat) || typeof body.lng !== 'number' || Number.isNaN(body.lng)) {
      return c.json(
        {
          success: false,
          error: { message: 'Coordinates must be valid numbers', code: 'INVALID_COORDINATES' },
        },
        400
      );
    }

    if (body.lat < 3 || body.lat > 15 || body.lng < 1 || body.lng > 16) {
      return c.json(
        { success: false, error: { message: 'Coordinates are outside Nigeria (lat: 3-15, lng: 1-16)', code: 'INVALID_COORDINATES' } },
        400
      );
    }
  }

  const token = c.env.GITHUB_TOKEN;
  if (!token) {
    return c.json(
      { success: false, error: { message: 'Contribution service unavailable', code: 'SERVICE_UNAVAILABLE' } },
      503
    );
  }

  const contributor = body.contributor_name || 'Anonymous';
  const coords = hasLat && hasLng ? `${body.lat}, ${body.lng}` : 'Not provided';

  const issueBody = [
    `**Market Name:** ${marketName}`,
    `**State:** ${state.name}`,
    `**LGA:** ${lga.name}`,
    `**Suggested Slug:** ${marketSlug}`,
    `**Coordinates:** ${coords}`,
    `**Description:** ${body.description || 'Not provided'}`,
    `**Submitted by:** ${contributor}`,
  ].join('\n');

  const response = await fetch('https://api.github.com/repos/ifihan/nigerian-markets-api/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'iya-oloja',
    },
    body: JSON.stringify({
      title: `[Market Submission] ${marketName} — ${lga.name}, ${state.name}`,
      body: issueBody,
      labels: ['market-submission'],
    }),
  });

  if (!response.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to create submission', code: 'UPSTREAM_ERROR' } },
      502
    );
  }

  const issue = (await response.json()) as { html_url: string };
  return c.json({ success: true, data: { issue_url: issue.html_url } }, 201);
});

export default app;
