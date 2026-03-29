/**
 * Syncs JSON data files to Cloudflare D1.
 *
 * This script reads all state JSON files from data/states/ and uses the
 * Cloudflare D1 HTTP API to rebuild the database. It runs in CI after
 * any changes to data/ are merged to main.
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

async function execSQL(sql: string, params: unknown[] = []) {
  const res = await fetch(`${BASE_URL}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 API error (${res.status}): ${text}`);
  }

  return res.json();
}

async function execSQLWithRetry(sql: string, params: unknown[] = [], retries = 3): Promise<unknown> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await execSQL(sql, params);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

async function runConcurrent(statements: { sql: string; params?: unknown[] }[], concurrency: number) {
  for (let i = 0; i < statements.length; i += concurrency) {
    const chunk = statements.slice(i, i + concurrency);
    await Promise.all(chunk.map((s) => execSQLWithRetry(s.sql, s.params ?? [])));
  }
}

async function main() {
  const dataDir = join(process.cwd(), 'data', 'states');
  const files = readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  const allStates: StateData[] = files.map((f) =>
    JSON.parse(readFileSync(join(dataDir, f), 'utf-8'))
  );

  console.log(`Syncing ${allStates.length} states to D1...`);

  // Step 1: Clear existing data (sequential, order matters for foreign keys)
  console.log('Clearing existing data...');
  await execSQL('DELETE FROM markets');
  await execSQL('DELETE FROM lgas');
  await execSQL('DELETE FROM states');

  // Step 2: Insert states (can run concurrently, no dependencies between them)
  console.log('Inserting states...');
  const stateStmts = allStates.map((s) => ({
    sql: 'INSERT INTO states (name, slug) VALUES (?, ?)',
    params: [s.name, s.slug],
  }));
  await runConcurrent(stateStmts, 3);
  console.log(`  ${stateStmts.length} states inserted`);

  // Step 3: Insert LGAs (depends on states being done, but LGAs can be concurrent)
  console.log('Inserting LGAs...');
  const lgaStmts: { sql: string; params: unknown[] }[] = [];
  for (const state of allStates) {
    for (const lga of state.lgas) {
      lgaStmts.push({
        sql: 'INSERT INTO lgas (state_id, name, slug) VALUES ((SELECT id FROM states WHERE slug = ?), ?, ?)',
        params: [state.slug, lga.name, lga.slug],
      });
    }
  }
  await runConcurrent(lgaStmts, 3);
  console.log(`  ${lgaStmts.length} LGAs inserted`);

  // Step 4: Insert markets (depends on LGAs being done)
  console.log('Inserting markets...');
  const marketStmts: { sql: string; params: unknown[] }[] = [];
  for (const state of allStates) {
    for (const lga of state.lgas) {
      for (const market of lga.markets) {
        marketStmts.push({
          sql: 'INSERT INTO markets (lga_id, name, slug, lat, lng, added_by) VALUES ((SELECT id FROM lgas WHERE slug = ?), ?, ?, ?, ?, ?)',
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
  await runConcurrent(marketStmts, 3);
  console.log(`  ${marketStmts.length} markets inserted`);

  console.log(`Done! Synced: ${allStates.length} states, ${lgaStmts.length} LGAs, ${marketStmts.length} markets`);
}

main().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
