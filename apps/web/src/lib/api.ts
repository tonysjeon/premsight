const BASE =
  (typeof window === 'undefined'
    ? (process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL)
    : process.env.NEXT_PUBLIC_API_URL) ?? 'http://localhost:8000';
export type Season = {
  id: string;
  name: string;
  competition_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};
export type FixtureStatus = 'scheduled' | 'live' | 'postponed' | 'cancelled' | 'completed';
export type Fixture = {
  id: string;
  season_id: string;
  home_team_id: string;
  home_team_name: string;
  away_team_id: string;
  away_team_name: string;
  status: FixtureStatus;
  kickoff_at: string;
  matchday: number | null;
  home_score: number | null;
  away_score: number | null;
  venue: string | null;
};
export type Team = {
  id: string;
  name: string;
  short_name: string | null;
  tla: string | null;
  crest_url: string | null;
  fixtures?: Fixture[];
};
export type Standing = {
  position: number;
  team_id: string;
  team_name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
};
export type Prediction = {
  model_version: string;
  home_team_id: string;
  away_team_id: string;
  expected_goals: { home: number; away: number };
  outcomes: { home_win: number; draw: number; away_win: number };
  likely_scores: Array<{
    home_goals: number;
    away_goals: number;
    probability: number;
  }>;
};
async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API request failed: GET ${BASE}${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}
export const api = {
  currentSeason: () => get<Season>('/v1/seasons/current'),
  seasons: async () => (await get<{ items: Season[] }>('/v1/seasons')).items,
  teams: async (q = '') => (await get<{ items: Team[] }>(`/v1/teams${q ? `?${q}` : ''}`)).items,
  fixtures: async (q = '') =>
    (await get<{ items: Fixture[] }>(`/v1/fixtures${q ? `?${q}` : ''}`)).items,
  fixture: (id: string) => get<Fixture>(`/v1/fixtures/${id}`),
  team: (id: string) => get<Team>(`/v1/teams/${id}`),
  standings: async (id: string) =>
    (await get<{ items: Standing[] }>(`/v1/standings?season_id=${id}`)).items,
  prediction: async (id: string): Promise<Prediction | null> => {
    const response = await fetch(`${BASE}/v1/fixtures/${id}/prediction`, {
      cache: 'no-store',
    });
    if (response.status === 422 || response.status === 503) return null;
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<Prediction>;
  },
};
