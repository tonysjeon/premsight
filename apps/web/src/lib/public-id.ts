import type { Season, Team } from '@/lib/api';
import type { TeamDirectory } from '@/lib/teams';

const SEASON_NAME = /^(\d{4})\s*[/–-]\s*(\d{2}|\d{4})$/;

export function seasonSlug(name: string): string {
  const matched = name.trim().match(SEASON_NAME);
  if (!matched) {
    return name.trim().toLowerCase().replaceAll(' ', '-').replaceAll('/', '-');
  }
  const start = matched[1];
  const rawEnd = matched[2];
  if (start === undefined || rawEnd === undefined) return name;
  return `${start}-${rawEnd.slice(-2)}`;
}

export function seasonPublicId(season: Pick<Season, 'id' | 'name'> & { slug?: string }): string {
  return season.slug ?? seasonSlug(season.name);
}

export function seasonMatches(
  season: Pick<Season, 'id' | 'name'> & { slug?: string },
  key: string,
): boolean {
  const needle = key.trim();
  if (!needle) return false;
  if (season.id === needle) return true;
  const compact = needle.replaceAll('/', '-').replaceAll('–', '-');
  return seasonPublicId(season).toLowerCase() === compact.toLowerCase();
}

export function resolveSeason<T extends Pick<Season, 'id' | 'name'> & { slug?: string }>(
  seasons: readonly T[],
  key: string | undefined,
  fallback: T,
): T {
  if (!key) return fallback;
  return seasons.find((season) => seasonMatches(season, key)) ?? fallback;
}

export function teamPublicId(team: Pick<Team, 'id' | 'tla'> & { slug?: string | null }): string {
  return (team.slug ?? team.tla ?? team.id).toLowerCase();
}

export function findTeamByPublicId<T extends Pick<Team, 'id' | 'tla'> & { slug?: string | null }>(
  teams: readonly T[],
  key: string,
): T | undefined {
  const needle = key.trim().toLowerCase();
  if (!needle) return undefined;
  return teams.find((team) => team.id === key || teamPublicId(team) === needle);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function teamPath(directory: TeamDirectory | undefined, teamId: string): string {
  const team = directory?.get(teamId);
  return `/teams/${team ? teamPublicId(team) : teamId}`;
}

export function withSeasonQuery(
  path: string,
  season: Pick<Season, 'id' | 'name'> & { slug?: string },
  extra: Record<string, string | number | null | undefined> = {},
): string {
  const params = new URLSearchParams();
  params.set('season', seasonPublicId(season));
  for (const [name, value] of Object.entries(extra)) {
    if (value === null || value === undefined || value === '') continue;
    params.set(name, String(value));
  }
  return `${path}?${params.toString()}`;
}
