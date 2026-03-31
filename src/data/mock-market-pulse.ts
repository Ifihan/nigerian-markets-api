import { STATE_COORDS } from './state-coordinates';

export interface MockStateStat {
  slug: string;
  name: string;
  market_count: number;
  lga_with_markets: number;
}

const STATE_NAMES: Record<string, string> = {
  abia: 'Abia',
  adamawa: 'Adamawa',
  'akwa-ibom': 'Akwa Ibom',
  anambra: 'Anambra',
  bauchi: 'Bauchi',
  bayelsa: 'Bayelsa',
  benue: 'Benue',
  borno: 'Borno',
  'cross-river': 'Cross River',
  delta: 'Delta',
  ebonyi: 'Ebonyi',
  edo: 'Edo',
  ekiti: 'Ekiti',
  enugu: 'Enugu',
  fct: 'FCT',
  gombe: 'Gombe',
  imo: 'Imo',
  jigawa: 'Jigawa',
  kaduna: 'Kaduna',
  kano: 'Kano',
  katsina: 'Katsina',
  kebbi: 'Kebbi',
  kogi: 'Kogi',
  kwara: 'Kwara',
  lagos: 'Lagos',
  nasarawa: 'Nasarawa',
  niger: 'Niger',
  ogun: 'Ogun',
  ondo: 'Ondo',
  osun: 'Osun',
  oyo: 'Oyo',
  plateau: 'Plateau',
  rivers: 'Rivers',
  sokoto: 'Sokoto',
  taraba: 'Taraba',
  yobe: 'Yobe',
  zamfara: 'Zamfara',
};

const HOT_STATE_OVERRIDES: Record<string, { market_count: number; lga_with_markets: number }> = {
  lagos: { market_count: 48, lga_with_markets: 11 },
  kano: { market_count: 37, lga_with_markets: 8 },
  anambra: { market_count: 29, lga_with_markets: 7 },
  rivers: { market_count: 26, lga_with_markets: 6 },
  abia: { market_count: 22, lga_with_markets: 5 },
  fct: { market_count: 18, lga_with_markets: 4 },
  oyo: { market_count: 16, lga_with_markets: 5 },
  kaduna: { market_count: 12, lga_with_markets: 4 },
  ogun: { market_count: 9, lga_with_markets: 3 },
  delta: { market_count: 7, lga_with_markets: 3 },
  enugu: { market_count: 6, lga_with_markets: 2 },
  edo: { market_count: 5, lga_with_markets: 2 },
  imo: { market_count: 4, lga_with_markets: 2 },
  kwara: { market_count: 4, lga_with_markets: 2 },
  plateau: { market_count: 3, lga_with_markets: 1 },
};

export function getMockMarketPulseData() {
  const stateStats: MockStateStat[] = Object.keys(STATE_COORDS).map((slug) => {
    const override = HOT_STATE_OVERRIDES[slug];
    return {
      slug,
      name: STATE_NAMES[slug] ?? slug.toUpperCase(),
      market_count: override?.market_count ?? 0,
      lga_with_markets: override?.lga_with_markets ?? 0,
    };
  });

  stateStats.sort((a, b) => b.market_count - a.market_count);

  const totalMarkets = stateStats.reduce((sum, state) => sum + state.market_count, 0);
  const totalStates = stateStats.length;
  const statesWithMarkets = stateStats.filter((state) => state.market_count > 0).length;
  const lgasWithData = stateStats.reduce((sum, state) => sum + state.lga_with_markets, 0);

  return {
    stateStats,
    totalMarkets,
    totalStates,
    statesWithMarkets,
    lgasWithData,
  };
}
