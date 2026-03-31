export interface State {
  id: number;
  name: string;
  slug: string;
}

export interface LGA {
  id: number;
  state_id: number;
  name: string;
  slug: string;
}

export interface Market {
  id: number;
  lga_id: number;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  added_by: string | null;
}

// Data file types (JSON structure in data/states/*.json)
export interface MarketData {
  name: string;
  slug: string;
  coordinates?: { lat: number; lng: number };
  added_by?: string;
}

export interface LGAData {
  name: string;
  slug: string;
  markets: MarketData[];
}

export interface StateData {
  name: string;
  slug: string;
  lgas: LGAData[];
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { total: number; limit: number; offset: number };
}

export interface ApiError {
  success: false;
  error: { message: string; code: string };
}

// Hono bindings
export type Bindings = {
  DB: D1Database;
  GITHUB_APP_ID: string;
  GITHUB_APP_PRIVATE_KEY: string;
  GITHUB_APP_INSTALLATION_ID: string;
  DOCS_URL?: string;
};
