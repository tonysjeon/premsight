import { getApiBase } from '@/lib/api-base';
import { findTeamByPublicId, isUuid } from '@/lib/public-id';

const BASE = getApiBase();
export type Season = {
  id: string;
  name: string;
  slug?: string;
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
  slug?: string | null;
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
export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'FWD';
export type DetailedPlayerPosition =
  | PlayerPosition
  | 'LB'
  | 'LWB'
  | 'CB'
  | 'RB'
  | 'RWB'
  | 'CDM'
  | 'CM'
  | 'CAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'CF'
  | 'ST';
export type Player = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  nationality_code: string | null;
  photo_url: string | null;
  slug: string | null;
  position?: PlayerPosition;
  positions?: DetailedPlayerPosition[];
  squad_number?: number | null;
  team_id?: string;
  team_name?: string;
  team_short_name?: string | null;
  team_tla?: string | null;
  team_crest_url?: string | null;
  scout_position?: string | null;
  scout_name?: string | null;
  season_stats?: {
    minutes: number;
    stats: Record<string, number>;
    features: number[];
    provider: string;
    model_version: string;
  } | null;
  archetype?: {
    position_family: PlayerPosition;
    cluster_id: number;
    cluster_label: string | null;
    model_version: string;
  } | null;
};
const PLAYER_LIST_TTL_MS = 60_000;
const playerListCache = new Map<string, { expires: number; items: Player[] }>();

async function get<T>(path: string, revalidate = 15): Promise<T> {
  const response = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (!response.ok) {
    throw new Error(`API request failed: GET ${BASE}${path} returned ${response.status}`);
  }
  return response.json() as Promise<T>;
}
export const api = {
  currentSeason: () => get<Season>('/v1/seasons/current', 60),
  seasons: async () => (await get<{ items: Season[] }>('/v1/seasons', 60)).items,
  teams: async (q = '') => (await get<{ items: Team[] }>(`/v1/teams${q ? `?${q}` : ''}`, 60)).items,
  fixtures: async (q = '') =>
    (await get<{ items: Fixture[] }>(`/v1/fixtures${q ? `?${q}` : ''}`)).items,
  fixture: (id: string) => get<Fixture>(`/v1/fixtures/${id}`),
  team: async (id: string) => {
    if (isUuid(id)) return get<Team>(`/v1/teams/${id}`, 60);
    const listed = await get<{ items: Team[] }>('/v1/teams', 60);
    const match = findTeamByPublicId(listed.items, id);
    if (match === undefined) {
      throw new Error(`API request failed: GET ${BASE}/v1/teams/${id} returned 404`);
    }
    return get<Team>(`/v1/teams/${match.id}`, 60);
  },
  standings: async (id: string) =>
    (await get<{ items: Standing[] }>(`/v1/standings?season_id=${id}`)).items,
  players: async (queryOrParams?: string) => {
    let queryString = '';
    if (queryOrParams) {
      if (queryOrParams.includes('=') || queryOrParams.startsWith('?')) {
        queryString = queryOrParams.startsWith('?') ? queryOrParams : `?${queryOrParams}`;
      } else {
        queryString = `?q=${encodeURIComponent(queryOrParams)}`;
      }
    }
    const path = `/v1/players${queryString}`;
    if (typeof window !== 'undefined') {
      const hit = playerListCache.get(path);
      if (hit && hit.expires > Date.now()) return hit.items;
    }
    const items = (await get<{ items: Player[] }>(path, 30)).items;
    if (typeof window !== 'undefined') {
      playerListCache.set(path, { expires: Date.now() + PLAYER_LIST_TTL_MS, items });
    }
    return items;
  },
  player: (id: string, seasonId?: string) =>
    get<Player>(`/v1/players/${id}${seasonId ? `?season_id=${seasonId}` : ''}`, 30),
  teamRoster: async (teamId: string, seasonId?: string) =>
    (
      await get<{ items: Player[] }>(
        `/v1/teams/${teamId}/roster${seasonId ? `?season_id=${seasonId}` : ''}`,
        30,
      )
    ).items,
  prediction: async (id: string): Promise<Prediction | null> => {
    const response = await fetch(`${BASE}/v1/fixtures/${id}/prediction`, {
      cache: 'no-store',
    });
    if (response.status === 422 || response.status === 503) return null;
    if (!response.ok) throw new Error(`API request failed: ${response.status}`);
    return response.json() as Promise<Prediction>;
  },
};
