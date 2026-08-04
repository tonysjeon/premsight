import type { Fixture } from '@/lib/api';

/**
 * Pure season derivations shared by the product surfaces. All formatting is UTC so
 * server-rendered output stays deterministic.
 */

const DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

const DATE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

const WINDOW_EDGE_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

export type ResultMark = 'W' | 'D' | 'L';
export type DayGroup = { key: string; label: string; fixtures: Fixture[] };

function byKickoff(a: Fixture, b: Fixture): number {
  return a.kickoff_at.localeCompare(b.kickoff_at);
}

function isPlayed(fixture: Fixture): boolean {
  return (
    fixture.status === 'completed' && fixture.home_score !== null && fixture.away_score !== null
  );
}

export function groupByDay(fixtures: readonly Fixture[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const fixture of [...fixtures].sort(byKickoff)) {
    const key = fixture.kickoff_at.slice(0, 10);
    const group = groups.get(key);
    if (group) group.fixtures.push(fixture);
    else
      groups.set(key, {
        key,
        label: DAY_LABEL.format(new Date(fixture.kickoff_at)),
        fixtures: [fixture],
      });
  }
  return [...groups.values()];
}

export function matchdays(fixtures: readonly Fixture[]): number[] {
  const found = new Set<number>();
  for (const fixture of fixtures) if (fixture.matchday !== null) found.add(fixture.matchday);
  return [...found].sort((a, b) => a - b);
}

/**
 * The matchday a visitor most likely wants: the next one with unplayed fixtures, or the
 * most recently completed one once the season is over.
 */
export function defaultMatchday(fixtures: readonly Fixture[]): number | null {
  const pending = fixtures.filter((fixture) => !isPlayed(fixture) && fixture.matchday !== null);
  if (pending.length) return Math.min(...pending.map((fixture) => fixture.matchday!));
  const days = matchdays(fixtures);
  return days.length ? days[days.length - 1] : null;
}

/** Accepts an untrusted query value and falls back to the default matchday. */
export function resolveMatchday(
  fixtures: readonly Fixture[],
  requested: string | string[] | undefined,
): number | null {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  if (raw !== undefined && /^\d{1,2}$/.test(raw)) {
    const parsed = Number.parseInt(raw, 10);
    if (matchdays(fixtures).includes(parsed)) return parsed;
  }
  return defaultMatchday(fixtures);
}

/** A slice of matchdays centred on the selection, for a link-based pager. */
export function matchdayWindow(
  days: readonly number[],
  selected: number | null,
  span = 7,
): number[] {
  if (days.length <= span) return [...days];
  const index = selected === null ? 0 : Math.max(days.indexOf(selected), 0);
  const start = Math.min(Math.max(index - Math.floor(span / 2), 0), days.length - span);
  return days.slice(start, start + span);
}

export function fixturesInMatchday(fixtures: readonly Fixture[], matchday: number): Fixture[] {
  return fixtures.filter((fixture) => fixture.matchday === matchday).sort(byKickoff);
}

/** Earliest unplayed fixture for each team in a season. */
export function nextFixtures(fixtures: readonly Fixture[]): ReadonlyMap<string, Fixture> {
  const next = new Map<string, Fixture>();
  const upcoming = fixtures
    .filter((fixture) => fixture.status !== 'completed' && fixture.status !== 'cancelled')
    .sort(byKickoff);
  for (const fixture of upcoming) {
    if (!next.has(fixture.home_team_id)) next.set(fixture.home_team_id, fixture);
    if (!next.has(fixture.away_team_id)) next.set(fixture.away_team_id, fixture);
  }
  return next;
}

/** Compact UTC date window for the fixtures assigned to one matchday. */
export function matchdayDateWindow(fixtures: readonly Fixture[]): string | undefined {
  if (!fixtures.length) return undefined;
  const sorted = [...fixtures].sort(byKickoff);
  const first = new Date(sorted[0].kickoff_at);
  const last = new Date(sorted[sorted.length - 1].kickoff_at);
  if (first.toISOString().slice(0, 10) === last.toISOString().slice(0, 10)) {
    return DATE_LABEL.format(first);
  }
  if (first.getUTCFullYear() === last.getUTCFullYear()) {
    return `${WINDOW_EDGE_LABEL.format(first)} – ${WINDOW_EDGE_LABEL.format(last)}, ${last.getUTCFullYear()}`;
  }
  return `${DATE_LABEL.format(first)} – ${DATE_LABEL.format(last)}`;
}

/** Most recent results per team, oldest first, capped at `limit` entries. */
export function formTable(
  fixtures: readonly Fixture[],
  limit = 5,
): ReadonlyMap<string, ResultMark[]> {
  const form = new Map<string, ResultMark[]>();
  const record = (teamId: string, mark: ResultMark) => {
    const marks = form.get(teamId) ?? [];
    marks.push(mark);
    form.set(teamId, marks.slice(-limit));
  };
  for (const fixture of fixtures.filter(isPlayed).sort(byKickoff)) {
    const home = fixture.home_score!;
    const away = fixture.away_score!;
    record(fixture.home_team_id, home === away ? 'D' : home > away ? 'W' : 'L');
    record(fixture.away_team_id, home === away ? 'D' : away > home ? 'W' : 'L');
  }
  return form;
}

export type SeasonSummary = {
  played: number;
  total: number;
  goals: number;
  goalsPerGame: string;
  homeWinShare: string;
  biggestWin: Fixture | null;
};

export function seasonSummary(fixtures: readonly Fixture[]): SeasonSummary {
  const played = fixtures.filter(isPlayed);
  const goals = played.reduce((total, f) => total + f.home_score! + f.away_score!, 0);
  const homeWins = played.filter((f) => f.home_score! > f.away_score!).length;
  const biggestWin = played.reduce<Fixture | null>((best, fixture) => {
    if (best === null) return fixture;
    const margin = Math.abs(fixture.home_score! - fixture.away_score!);
    return margin > Math.abs(best.home_score! - best.away_score!) ? fixture : best;
  }, null);
  return {
    played: played.length,
    total: fixtures.length,
    goals,
    goalsPerGame: played.length ? (goals / played.length).toFixed(2) : '—',
    homeWinShare: played.length ? `${Math.round((homeWins / played.length) * 100)}%` : '—',
    biggestWin,
  };
}
