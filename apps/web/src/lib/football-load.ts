import { cache } from 'react';
import { api } from '@/lib/api';

export const loadCurrentSeason = cache(() => api.currentSeason());
export const loadSeasons = cache(() => api.seasons());
export const loadTeams = cache((query = '') => api.teams(query));
export const loadFixtures = cache((query: string) => api.fixtures(query));
export const loadStandings = cache((seasonId: string) => api.standings(seasonId));
export const loadTeam = cache((id: string) => api.team(id));
export const loadFixture = cache((id: string) => api.fixture(id));
export const loadRoster = cache((teamId: string, seasonId?: string) =>
  api.teamRoster(teamId, seasonId).catch(() => []),
);
export const loadScoutPlayers = cache(() => api.players('has_stats=true').catch(() => []));
