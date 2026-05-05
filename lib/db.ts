import type { State, LGA, Market } from '../types';

function parseDays(days: string | null | undefined): string[] | null {
  if (!days) return null;

  try {
    const parsed = JSON.parse(days);
    if (Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function mapMarketRow(row: Record<string, unknown>): Market {
  return {
    id: Number(row.id),
    lga_id: Number(row.lga_id),
    name: String(row.name),
    slug: String(row.slug),
    lat: typeof row.lat === 'number' ? row.lat : row.lat == null ? null : Number(row.lat),
    lng: typeof row.lng === 'number' ? row.lng : row.lng == null ? null : Number(row.lng),
    added_by: typeof row.added_by === 'string' ? row.added_by : null,
    frequency: typeof row.frequency === 'string' ? row.frequency : null,
    days: typeof row.days === 'string' || row.days == null ? parseDays(row.days as string | null) : null,
    type: typeof row.type === 'string' ? row.type : null,
    local_name: typeof row.local_name === 'string' ? row.local_name : null,
  };
}

export async function getStates(db: D1Database): Promise<State[]> {
  const { results } = await db.prepare('SELECT * FROM states ORDER BY name').all<State>();
  return results;
}

export async function getStateBySlug(
  db: D1Database,
  slug: string,
  opts: { includeLgas?: boolean } = {}
) {
  const state = await db.prepare('SELECT * FROM states WHERE slug = ?').bind(slug).first<State>();
  if (!state) return null;

  const lgaCount = await db
    .prepare('SELECT COUNT(*) as total FROM lgas WHERE state_id = ?')
    .bind(state.id)
    .first<{ total: number }>();

  const marketCount = await db
    .prepare(
      `SELECT COUNT(m.id) as total
       FROM markets m
       JOIN lgas l ON m.lga_id = l.id
       WHERE l.state_id = ?`
    )
    .bind(state.id)
    .first<{ total: number }>();

  const data: State & { lga_count: number; market_count: number; lgas?: LGA[] } = {
    ...state,
    lga_count: lgaCount?.total ?? 0,
    market_count: marketCount?.total ?? 0,
  };

  if (opts.includeLgas) {
    const { results: lgas } = await db
      .prepare('SELECT * FROM lgas WHERE state_id = ? ORDER BY name')
      .bind(state.id)
      .all<LGA>();
    data.lgas = lgas;
  }

  return data;
}

export async function getLGAs(db: D1Database, opts: { stateSlug?: string } = {}) {
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];

  if (opts.stateSlug) {
    conditions.push('s.slug = ?');
    bindings.push(opts.stateSlug);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { results } = await db
    .prepare(
      `SELECT l.id, l.state_id, l.name, l.slug, COUNT(m.id) as market_count
       FROM lgas l
       JOIN states s ON l.state_id = s.id
       LEFT JOIN markets m ON m.lga_id = l.id
       ${whereClause}
       GROUP BY l.id
       ORDER BY s.name ASC, l.name ASC`
    )
    .bind(...bindings)
    .all();

  return results;
}

export async function getLGABySlug(
  db: D1Database,
  slug: string,
  opts: { includeMarkets?: boolean } = {}
) {
  const lga = await db.prepare('SELECT * FROM lgas WHERE slug = ?').bind(slug).first<LGA>();
  if (!lga) return null;

  const state = await db.prepare('SELECT * FROM states WHERE id = ?').bind(lga.state_id).first<State>();

  const marketCount = await db
    .prepare('SELECT COUNT(*) as total FROM markets WHERE lga_id = ?')
    .bind(lga.id)
    .first<{ total: number }>();

  const data: LGA & { state: State | null; market_count: number; markets?: Market[] } = {
    ...lga,
    state: state ?? null,
    market_count: marketCount?.total ?? 0,
  };

  if (opts.includeMarkets) {
    const { results } = await db
      .prepare(
        'SELECT id, lga_id, name, slug, lat, lng, added_by, frequency, days, type, local_name FROM markets WHERE lga_id = ? ORDER BY name'
      )
      .bind(lga.id)
      .all();
    data.markets = (results ?? []).map((row) => mapMarketRow(row as Record<string, unknown>));
  }

  return data;
}

export async function getMarkets(
  db: D1Database,
  opts: {
    limit: number;
    offset: number;
    order: 'asc' | 'desc';
    q?: string;
    stateSlug?: string;
    lgaSlug?: string;
  }
) {
  const conditions: string[] = [];
  const bindings: Array<string | number> = [];

  if (opts.q) {
    const pattern = `%${opts.q}%`;
    conditions.push('(m.name LIKE ? OR l.name LIKE ? OR s.name LIKE ?)');
    bindings.push(pattern, pattern, pattern);
  }

  if (opts.stateSlug) {
    conditions.push('s.slug = ?');
    bindings.push(opts.stateSlug);
  }

  if (opts.lgaSlug) {
    conditions.push('l.slug = ?');
    bindings.push(opts.lgaSlug);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await db
    .prepare(
      `SELECT COUNT(*) as total
       FROM markets m
       JOIN lgas l ON m.lga_id = l.id
       JOIN states s ON l.state_id = s.id
       ${whereClause}`
    )
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total ?? 0;

  const { results: markets } = await db
    .prepare(
      `SELECT m.id, m.lga_id, m.name, m.slug, m.lat, m.lng, m.added_by, m.frequency, m.days, m.type, m.local_name,
              l.name as lga_name, l.slug as lga_slug, s.name as state_name, s.slug as state_slug
       FROM markets m
       JOIN lgas l ON m.lga_id = l.id
       JOIN states s ON l.state_id = s.id
       ${whereClause}
       ORDER BY m.name ${opts.order === 'desc' ? 'DESC' : 'ASC'}
       LIMIT ? OFFSET ?`
    )
    .bind(...bindings, opts.limit, opts.offset)
    .all();

  return {
    markets: (markets ?? []).map((row) => ({
      ...mapMarketRow(row as Record<string, unknown>),
      lga_name: row.lga_name,
      lga_slug: row.lga_slug,
      state_name: row.state_name,
      state_slug: row.state_slug,
    })),
    total,
  };
}

export async function getCoverageSummary(db: D1Database) {
  const { results: stateStats } = await db
    .prepare(
      `SELECT s.slug, s.name, COUNT(m.id) as market_count,
              COUNT(DISTINCT CASE WHEN m.id IS NOT NULL THEN l.id END) as lga_with_markets
       FROM states s
       LEFT JOIN lgas l ON l.state_id = s.id
       LEFT JOIN markets m ON m.lga_id = l.id
       GROUP BY s.id
       ORDER BY market_count DESC, s.name ASC`
    )
    .all();

  const totalMarkets = await db.prepare('SELECT COUNT(*) as total FROM markets').first<{ total: number }>();
  const totalStates = await db.prepare('SELECT COUNT(*) as total FROM states').first<{ total: number }>();
  const statesWithMarkets = await db
    .prepare(
      `SELECT COUNT(*) as total
       FROM (
         SELECT s.id
         FROM states s
         JOIN lgas l ON l.state_id = s.id
         JOIN markets m ON m.lga_id = l.id
         GROUP BY s.id
       )`
    )
    .first<{ total: number }>();
  const lgasWithMarkets = await db
    .prepare('SELECT COUNT(DISTINCT lga_id) as total FROM markets')
    .first<{ total: number }>();

  return {
    total_markets: totalMarkets?.total ?? 0,
    total_states: totalStates?.total ?? 0,
    states_with_markets: statesWithMarkets?.total ?? 0,
    lgas_with_markets: lgasWithMarkets?.total ?? 0,
    state_stats: stateStats,
  };
}
