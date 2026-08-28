import type { Fixture } from '@/lib/api';
import { defaultMatchday } from './season.ts';
import { calendarDayKey } from './time.ts';

export type MatchTab = 'preview' | 'table' | 'h2h';
export type H2hScope = 'tournament' | 'home';

export type HeadToHeadRecord = {
  homeWins: number;
  draws: number;
  awayWins: number;
};

const TABS = new Set<MatchTab>(['preview', 'table', 'h2h']);

export function isCurrentWeekMatch(
  match: Fixture,
  seasonFixtures: readonly Fixture[],
  isCurrentSeason = true,
): boolean {
  if (match.status === 'completed' || match.status === 'cancelled') return false;
  if (!isCurrentSeason) return false;
  const activeMatchday = defaultMatchday(seasonFixtures);
  if (activeMatchday !== null && match.matchday !== null) {
    return match.matchday === activeMatchday;
  }
  return true;
}

export function resolveMatchTab(
  requested: string | string[] | undefined,
  hasPreview: boolean = true,
): MatchTab {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  if (!hasPreview) {
    if (raw === 'h2h') return 'h2h';
    return 'table';
  }
  if (raw && TABS.has(raw as MatchTab)) return raw as MatchTab;
  return 'preview';
}

export function kickoffCountdown(
  kickoffIso: string,
  nowIso: string,
  timeZone = 'UTC',
): string | null {
  const remainingMs = Date.parse(kickoffIso) - Date.parse(nowIso);
  if (!Number.isFinite(remainingMs) || remainingMs <= 0) return null;

  const kickoffDay = Date.parse(`${calendarDayKey(kickoffIso, timeZone)}T00:00:00Z`);
  const nowDay = Date.parse(`${calendarDayKey(nowIso, timeZone)}T00:00:00Z`);
  const dayDiff = Math.round((kickoffDay - nowDay) / 86_400_000);

  if (dayDiff <= 0) return 'Today';
  if (dayDiff === 1) return 'Tomorrow';
  return `${dayDiff} days`;
}

function isCompleted(fixture: Fixture): boolean {
  return (
    fixture.status === 'completed' && fixture.home_score !== null && fixture.away_score !== null
  );
}

export function headToHeadMeetings(
  fixtures: readonly Fixture[],
  homeTeamId: string,
  awayTeamId: string,
  currentFixtureId: string,
): Fixture[] {
  const pair = new Set([homeTeamId, awayTeamId]);
  return fixtures
    .filter((fixture) => fixture.id !== currentFixtureId)
    .filter((fixture) => pair.has(fixture.home_team_id) && pair.has(fixture.away_team_id))
    .filter(isCompleted)
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at));
}

/** Home keeps only meetings hosted by the current home side; tournament is every meeting. */
export function resolveH2hScope(requested: string | string[] | undefined): H2hScope {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  return raw === 'home' ? 'home' : 'tournament';
}

export function scopedHeadToHeadMeetings(
  meetings: readonly Fixture[],
  homeTeamId: string,
  scope: H2hScope,
): Fixture[] {
  if (scope === 'home') return meetings.filter((fixture) => fixture.home_team_id === homeTeamId);
  return [...meetings];
}

export function headToHeadRecord(
  meetings: readonly Fixture[],
  homeTeamId: string,
  awayTeamId: string,
): HeadToHeadRecord {
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  for (const meeting of meetings) {
    if (meeting.home_score === meeting.away_score) {
      draws += 1;
      continue;
    }
    const winnerId =
      meeting.home_score! > meeting.away_score! ? meeting.home_team_id : meeting.away_team_id;
    if (winnerId === homeTeamId) homeWins += 1;
    else if (winnerId === awayTeamId) awayWins += 1;
  }
  return { homeWins, draws, awayWins };
}
