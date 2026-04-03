/**
 * Syncs JSON data files to Cloudflare D1.
 *
 * Uses upserts (INSERT ... ON CONFLICT DO UPDATE) so only changed rows are
 * written.  Stale rows whose slugs no longer appear in the JSON source are
 * deleted at the end, in child-first order to respect foreign keys.
 *
 * Each batch API call is atomic (D1 rolls back on failure), but the full
 * sync spans multiple batches and is NOT globally atomic — a failure
 * mid-sync can leave a mix of old and new data.
 *
 * Required env vars:
 *   CLOUDFLARE_API_TOKEN
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_DATABASE_ID
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { StateData } from '../types';

const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID;

if (!API_TOKEN || !ACCOUNT_ID || !DATABASE_ID) {
  console.error('Missing required env vars: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID');
  process.exit(1);
}

const BASE_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}`;

async function execBatch(statements: { sql: string; params?: unknown[] }[]) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ batch: statements }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error (${res.status}): ${text}`);
  }

  return res.json();
}

async function execBatchWithRetry(statements: { sql: string; params?: unknown[] }[], retries = 3): Promise<unknown> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await execBatch(statements);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Splits statements into chunks and sends each chunk as an atomic batch.
 * D1 batches are transactional — if any statement in a batch fails, the
 * entire batch is rolled back.
 */
async function runBatched(statements: { sql: string; params?: unknown[] }[], batchSize: number) {
  for (let i = 0; i < statements.length; i += batchSize) {
    const chunk = statements.slice(i, i + batchSize);
    await execBatchWithRetry(chunk);
  }
}

/**
 * Escapes a string for safe use as a SQL string literal.
 * Slugs only contain [a-z0-9-] so this is mostly defensive.
 */
function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Deletes rows from `table` whose slugs are NOT in `validSlugs`.
 * Inlines slug values directly in the SQL to avoid D1's 100-param limit
 * and the SQLITE_AUTH restriction on temp tables via the HTTP API.
 */
async function deleteStale(table: string, validSlugs: string[]) {
  if (validSlugs.length === 0) {
    await execBatchWithRetry([{ sql: `DELETE FROM ${table}` }]);
    return;
  }

  const slugList = validSlugs.map(sqlLiteral).join(', ');
  await execBatchWithRetry([
    { sql: `DELETE FROM ${table} WHERE slug NOT IN (${slugList})` },
  ]);
}

async function main() {
  const dataDir = join(process.cwd(), 'data', 'states');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  const allStates: StateData[] = files.map((f) =>
    JSON.parse(readFileSync(join(dataDir, f), 'utf-8'))
  );

  // Collect all expected slugs from JSON source
  const stateSlugs: string[] = [];
  const lgaSlugs: string[] = [];
  const marketSlugs: string[] = [];

  for (const state of allStates) {
    stateSlugs.push(state.slug);
    for (const lga of state.lgas) {
      lgaSlugs.push(lga.slug);
      for (const market of lga.markets) {
        marketSlugs.push(market.slug);
      }
    }
  }

  console.log(`Syncing ${allStates.length} states to D1...`);

  // Upsert states
  console.log('Upserting states...');
  const stateStmts = allStates.map((s) => ({
    sql: `INSERT INTO states (name, slug) VALUES (?, ?)
          ON CONFLICT(slug) DO UPDATE SET name = excluded.name`,
    params: [s.name, s.slug],
  }));
  await runBatched(stateStmts, 50);
  console.log(`  ${stateStmts.length} states upserted`);

  // Upsert LGAs
  console.log('Upserting LGAs...');
  const lgaStmts: { sql: string; params: unknown[] }[] = [];
  for (const state of allStates) {
    for (const lga of state.lgas) {
      lgaStmts.push({
        sql: `INSERT INTO lgas (state_id, name, slug) VALUES ((SELECT id FROM states WHERE slug = ?), ?, ?)
              ON CONFLICT(slug) DO UPDATE SET name = excluded.name, state_id = excluded.state_id`,
        params: [state.slug, lga.name, lga.slug],
      });
    }
  }
  await runBatched(lgaStmts, 50);
  console.log(`  ${lgaStmts.length} LGAs upserted`);

  // Upsert markets
  console.log('Upserting markets...');
  const marketStmts: { sql: string; params: unknown[] }[] = [];
  for (const state of allStates) {
    for (const lga of state.lgas) {
      for (const market of lga.markets) {
        marketStmts.push({
          sql: `INSERT INTO markets (lga_id, name, slug, lat, lng, added_by)
                VALUES ((SELECT id FROM lgas WHERE slug = ?), ?, ?, ?, ?, ?)
                ON CONFLICT(slug) DO UPDATE SET
                  name = excluded.name,
                  lga_id = excluded.lga_id,
                  lat = excluded.lat,
                  lng = excluded.lng,
                  added_by = excluded.added_by`,
          params: [
            lga.slug,
            market.name,
            market.slug,
            market.coordinates?.lat ?? null,
            market.coordinates?.lng ?? null,
            market.added_by ?? null,
          ],
        });
      }
    }
  }
  await runBatched(marketStmts, 50);
  console.log(`  ${marketStmts.length} markets upserted`);

  // Delete stale rows (child-first to respect foreign keys)
  // Each deleteStale call uses a temp table so it works for any number of slugs.
  console.log('Removing stale rows...');
  await deleteStale('markets', marketSlugs);
  await deleteStale('lgas', lgaSlugs);
  await deleteStale('states', stateSlugs);
  console.log('Stale rows removed');

  console.log(`Done! Synced: ${allStates.length} states, ${lgaStmts.length} LGAs, ${marketStmts.length} markets`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
