import { Hono } from 'hono';
import type { Bindings } from '../../types';

const app = new Hono<{ Bindings: Bindings }>();

const REPO = 'ifihan/nigerian-markets-api';
const GH_API = 'https://api.github.com';

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

interface MarketEntry {
  name: string;
  slug: string;
  coordinates?: { lat: number; lng: number };
  added_by?: string;
}

interface LGAEntry {
  name: string;
  slug: string;
  markets: MarketEntry[];
}

interface StateFile {
  name: string;
  slug: string;
  lgas: LGAEntry[];
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createGitHubAppJwt(appId: string, privateKeyPem: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

  const enc = new TextEncoder();
  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key using Web Crypto
  const pemBody = privateKeyPem
    .replace(/-----BEGIN RSA PRIVATE KEY-----|-----END RSA PRIVATE KEY-----|\n|\r/g, '');
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${sigB64}`;
}

async function getInstallationToken(appId: string, privateKey: string, installationId: string): Promise<string> {
  const jwt = await createGitHubAppJwt(appId, privateKey);

  const res = await fetch(`${GH_API}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'iya-oloja',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to get installation token: ${res.status}`);
  }

  const data = (await res.json()) as { token: string };
  return data.token;
}

async function ghFetch(path: string, token: string, options: RequestInit = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'iya-oloja',
      Accept: 'application/vnd.github.v3+json',
      ...(options.headers || {}),
    },
  });
  return res;
}

app.post('/', async (c) => {
  const body = await c.req.json<{
    market_name: string;
    state: string;
    lga: string;
    lat: number;
    lng: number;
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
    .prepare('SELECT id, name, slug FROM states WHERE LOWER(name) = LOWER(?) OR slug = ?')
    .bind(stateInput, slugify(stateInput))
    .first<{ id: number; name: string; slug: string }>();

  if (!state) {
    return c.json(
      { success: false, error: { message: `State "${stateInput}" not found`, code: 'INVALID_STATE' } },
      400
    );
  }

  // Validate LGA exists under that state
  const lga = await db
    .prepare('SELECT id, name, slug FROM lgas WHERE state_id = ? AND (LOWER(name) = LOWER(?) OR slug = ?)')
    .bind(state.id, lgaInput, slugify(lgaInput))
    .first<{ id: number; name: string; slug: string }>();

  if (!lga) {
    return c.json(
      { success: false, error: { message: `LGA "${lgaInput}" not found in ${state.name}`, code: 'INVALID_LGA' } },
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

  if (typeof body.lat !== 'number' || Number.isNaN(body.lat) || typeof body.lng !== 'number' || Number.isNaN(body.lng)) {
    return c.json(
      {
        success: false,
        error: { message: 'Coordinates (lat and lng) are required and must be valid numbers', code: 'INVALID_COORDINATES' },
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

  const { GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID } = c.env;
  if (!GITHUB_APP_ID || !GITHUB_APP_PRIVATE_KEY || !GITHUB_APP_INSTALLATION_ID) {
    return c.json(
      { success: false, error: { message: 'Contribution service unavailable', code: 'SERVICE_UNAVAILABLE' } },
      503
    );
  }

  let token: string;
  try {
    token = await getInstallationToken(GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID);
  } catch {
    return c.json(
      { success: false, error: { message: 'Failed to authenticate with GitHub', code: 'AUTH_ERROR' } },
      502
    );
  }

  // --- Automated PR flow ---
  // 1. Get the latest SHA of the main branch
  const mainRef = await ghFetch(`/repos/${REPO}/git/ref/heads/main`, token);
  if (!mainRef.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to read repository', code: 'UPSTREAM_ERROR' } },
      502
    );
  }
  const mainData = (await mainRef.json()) as { object: { sha: string } };
  const baseSha = mainData.object.sha;

  // 2. Fetch the current state JSON file
  const filePath = `data/states/${state.slug}.json`;
  const fileRes = await ghFetch(`/repos/${REPO}/contents/${filePath}?ref=main`, token);
  if (!fileRes.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to read state data file', code: 'UPSTREAM_ERROR' } },
      502
    );
  }
  const fileData = (await fileRes.json()) as { content: string; sha: string };
  const fileContent = atob(fileData.content.replace(/\n/g, ''));
  const stateFile: StateFile = JSON.parse(fileContent);

  // 3. Add the new market to the correct LGA
  const lgaEntry = stateFile.lgas.find(
    (l) => l.slug === lga.slug || normalizeText(l.name) === normalizeText(lga.name)
  );

  if (!lgaEntry) {
    return c.json(
      { success: false, error: { message: `LGA "${lga.name}" not found in state data file`, code: 'DATA_MISMATCH' } },
      500
    );
  }

  const newMarket: MarketEntry = {
    name: marketName,
    slug: marketSlug,
  };

  newMarket.coordinates = { lat: body.lat, lng: body.lng };

  const contributor = body.contributor_name?.trim();
  if (contributor) {
    newMarket.added_by = contributor;
  }

  lgaEntry.markets.push(newMarket);

  const updatedContent = JSON.stringify(stateFile, null, 2) + '\n';

  // 4. Create a new branch
  const branchName = `market/${marketSlug}-${Date.now()}`;
  const createBranch = await ghFetch(`/repos/${REPO}/git/refs`, token, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    }),
  });

  if (!createBranch.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to create branch', code: 'UPSTREAM_ERROR' } },
      502
    );
  }

  // 5. Update the file on the new branch
  const commitMessage = `feat: add ${marketName} to ${lga.name}, ${state.name}`;
  const updateFile = await ghFetch(`/repos/${REPO}/contents/${filePath}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      message: commitMessage,
      content: btoa(updatedContent),
      sha: fileData.sha,
      branch: branchName,
    }),
  });

  if (!updateFile.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to commit changes', code: 'UPSTREAM_ERROR' } },
      502
    );
  }

  // 6. Create the pull request
  const coords = `${body.lat}, ${body.lng}`;
  const prBody = [
    `## New Market Submission`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| **Market** | ${marketName} |`,
    `| **State** | ${state.name} |`,
    `| **LGA** | ${lga.name} |`,
    `| **Slug** | \`${marketSlug}\` |`,
    `| **Coordinates** | ${coords} |`,
    `| **Submitted by** | ${contributor || 'Anonymous'} |`,
    ``,
    body.description ? `### Description\n${body.description}\n` : '',
    `---`,
    `*Submitted via the [Iya Oloja](https://iya-oloja.pages.dev) contribution form.*`,
  ].filter(Boolean).join('\n');

  const createPr = await ghFetch(`/repos/${REPO}/pulls`, token, {
    method: 'POST',
    body: JSON.stringify({
      title: `feat: add ${marketName} — ${lga.name}, ${state.name}`,
      body: prBody,
      head: branchName,
      base: 'main',
      labels: ['market-submission'],
    }),
  });

  if (!createPr.ok) {
    return c.json(
      { success: false, error: { message: 'Failed to create pull request', code: 'UPSTREAM_ERROR' } },
      502
    );
  }

  const pr = (await createPr.json()) as { html_url: string; number: number };

  // 7. Add the label (PR create doesn't support labels directly, use issues API)
  await ghFetch(`/repos/${REPO}/issues/${pr.number}/labels`, token, {
    method: 'POST',
    body: JSON.stringify({ labels: ['market-submission'] }),
  });

  return c.json(
    {
      success: true,
      data: {
        pr_url: pr.html_url,
        message: `Pull request created! It will be reviewed and merged shortly.`,
      },
    },
    201
  );
});

export default app;
