import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { MarketData, StateData } from '../types';

const DAY_COLUMNS = [
  ['mrkt_mon', 'Mon'],
  ['mrkt_tue', 'Tue'],
  ['mrkt_wed', 'Wed'],
  ['mrkt_thur', 'Thu'],
  ['mrkt_fri', 'Fri'],
  ['mrkt_sat', 'Sat'],
  ['mrkt_sun', 'Sun'],
] as const;

const LGA_OVERRIDES: Record<string, Record<string, string>> = {
  abia: {
    'Isiala-Ngwa North': 'Isiala Ngwa North',
    'Isiala-Ngwa South': 'Isiala Ngwa South',
    'Obi Nwga': 'Obi Ngwa',
    'Umu-Nneochi': 'Umu Nneochi',
  },
  bayelsa: {
    Yenegoa: 'Yenagoa',
  },
  benue: {
    Oturkpo: 'Otukpo',
  },
  'cross-river': {
    Bekwarra: 'Bekwara',
  },
  edo: {
    Iguegben: 'Igueben',
  },
  gombe: {
    Shomgom: 'Shongom',
  },
  imo: {
    Mbatoli: 'Mbaitoli',
  },
  kano: {
    'Garun Malam': 'Garun Mallam',
    Nassarawa: 'Nasarawa',
  },
  fct: {
    'Municipal Area Council': 'Abuja Municipal',
  },
};

// Maps CSV statename values to JSON state names where they differ
const CSV_STATE_NAME_OVERRIDES: Record<string, string> = {
  Fct: 'Federal Capital Territory',
};

type CsvRow = Record<string, string>;

function parseArgs() {
  const args = process.argv.slice(2);
  let stateName = 'Abia';
  let csvPath = join(process.cwd(), 'markets.csv');

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--state' && args[i + 1]) {
      stateName = args[i + 1];
      i += 1;
    } else if (arg === '--csv' && args[i + 1]) {
      csvPath = join(process.cwd(), args[i + 1]);
      i += 1;
    }
  }

  return { stateName, csvPath };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])([a-z']*)/g, (_, first: string, rest: string) => first.toUpperCase() + rest);
}

function normalizeSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeForMatch(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .replace(/[-/]/g, ' ')
    .replace(/[^a-z0-9 ]+/g, '');
}

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let currentField = '';
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      currentRow.push(currentField);
      currentField = '';

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  const [header, ...dataRows] = rows;
  if (!header) {
    return [];
  }

  return dataRows.map((row) => {
    const record: CsvRow = {};
    for (let i = 0; i < header.length; i += 1) {
      record[header[i]] = row[i] ?? '';
    }
    return record;
  });
}

function optionalString(value: string): string | undefined {
  const trimmed = normalizeSpaces(value);
  return trimmed.length > 0 ? trimmed : undefined;
}

function deriveDays(row: CsvRow): string[] | undefined {
  const days = DAY_COLUMNS
    .filter(([column]) => row[column]?.trim().toLowerCase() === 'yes')
    .map(([, day]) => day);

  return days.length > 0 ? days : undefined;
}

function formatAddedBy(editor: string): string {
  const trimmed = normalizeSpaces(editor);
  return trimmed ? `GRID3 (${trimmed})` : 'GRID3';
}

function buildMarketName(rawName: string, lgaName: string): string {
  const baseName = titleCase(normalizeSpaces(rawName));
  if (normalizeForMatch(baseName).includes(normalizeForMatch(lgaName))) {
    return baseName;
  }
  return `${baseName}, ${lgaName}`;
}

function loadStateData(): StateData[] {
  const dataDir = join(process.cwd(), 'data', 'states');
  return readdirSync(dataDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8')) as StateData);
}

function main() {
  const { stateName, csvPath } = parseArgs();
  const allStates = loadStateData();
  const jsonStateName = CSV_STATE_NAME_OVERRIDES[stateName] ?? stateName;
  const targetState = allStates.find((state) => state.name.toLowerCase() === jsonStateName.toLowerCase());

  if (!targetState) {
    throw new Error(`State "${stateName}" not found in data/states`);
  }

  const csvContent = readFileSync(csvPath, 'utf8');
  const rows = parseCsv(csvContent);
  const lgaOverrides = LGA_OVERRIDES[targetState.slug] ?? {};
  const lgaByNormalizedName = new Map(
    targetState.lgas.map((lga) => [normalizeForMatch(lga.name), lga])
  );

  const existingGlobalSlugs = new Set<string>();
  const existingStateSlugs = new Set<string>();

  for (const state of allStates) {
    for (const lga of state.lgas) {
      for (const market of lga.markets) {
        if (state.slug === targetState.slug) {
          existingStateSlugs.add(market.slug);
        } else {
          existingGlobalSlugs.add(market.slug);
        }
      }
    }
  }

  const importedByLga = new Map<string, MarketData[]>();
  const importedSlugs = new Set<string>();
  const skippedSupermarkets: string[] = [];
  const duplicateSlugs: string[] = [];
  const missingLgas = new Set<string>();
  const invalidCoordinates: string[] = [];
  const conflictingSlugs: string[] = [];

  for (const row of rows) {
    if (row.statename?.trim().toLowerCase() !== stateName.toLowerCase()) {
      continue;
    }

    if (row.market_nam?.trim().toLowerCase().includes('supermarket')) {
      skippedSupermarkets.push(row.market_nam);
      continue;
    }

    const sourceLgaName = lgaOverrides[row.lganame] ?? row.lganame;
    const matchedLga = lgaByNormalizedName.get(normalizeForMatch(sourceLgaName));
    if (!matchedLga) {
      missingLgas.add(row.lganame);
      continue;
    }

    const lat = Number.parseFloat(row.lat);
    const lng = Number.parseFloat(row.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      invalidCoordinates.push(`${row.market_nam} (${row.lat}, ${row.lng})`);
      continue;
    }

    const name = buildMarketName(row.market_nam, matchedLga.name);
    const slug = slugify(name);

    if (existingGlobalSlugs.has(slug) || existingStateSlugs.has(slug)) {
      conflictingSlugs.push(slug);
      continue;
    }

    if (importedSlugs.has(slug)) {
      duplicateSlugs.push(slug);
      continue;
    }

    const market: MarketData = {
      name,
      slug,
      coordinates: { lat, lng },
      added_by: formatAddedBy(row.editor),
    };

    const frequency = optionalString(row.mrkt_frqcy);
    if (frequency) {
      market.frequency = frequency;
    }

    const type = optionalString(row.mrkt_type);
    if (type) {
      market.type = type;
    }

    const localName = optionalString(row.mrkt_setnm);
    if (localName) {
      market.local_name = localName;
    }

    const days = deriveDays(row);
    if (days) {
      market.days = days;
    }

    const bucket = importedByLga.get(matchedLga.slug) ?? [];
    bucket.push(market);
    importedByLga.set(matchedLga.slug, bucket);
    importedSlugs.add(slug);
  }

  if (missingLgas.size > 0) {
    throw new Error(`Unmapped LGAs for ${stateName}: ${Array.from(missingLgas).sort().join(', ')}`);
  }

  if (invalidCoordinates.length > 0) {
    throw new Error(`Invalid coordinates found for ${invalidCoordinates.length} row(s)`);
  }

  const mergedState: StateData = {
    ...targetState,
    lgas: targetState.lgas.map((lga) => {
      const importedMarkets = importedByLga.get(lga.slug) ?? [];
      const existingMarkets = [...lga.markets];
      const mergedMarkets = [...existingMarkets, ...importedMarkets].sort((a, b) => a.name.localeCompare(b.name));
      return {
        ...lga,
        markets: mergedMarkets,
      };
    }),
  };

  const filePath = join(process.cwd(), 'data', 'states', `${targetState.slug}.json`);
  writeFileSync(filePath, `${JSON.stringify(mergedState, null, 2)}\n`);

  console.log(
    `Imported ${importedSlugs.size} GRID3 market(s) into ${targetState.name}. ` +
      `Skipped ${skippedSupermarkets.length} supermarket row(s), ${duplicateSlugs.length} duplicate slug(s), and ${conflictingSlugs.length} conflicting existing slug(s).`
  );

  if (duplicateSlugs.length > 0) {
    console.warn(`Duplicate imported slugs skipped: ${duplicateSlugs.slice(0, 10).join(', ')}`);
  }

  if (conflictingSlugs.length > 0) {
    console.warn(`Existing market slug conflicts skipped: ${conflictingSlugs.slice(0, 10).join(', ')}`);
  }
}

main();
