import type { Fixture, Standing } from '@/lib/api';

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
export type VenueFilter = 'all' | 'home' | 'away';
export type FixturePeriod = { key: string; label: string; fixtures: Fixture[] };

/** Team-hub fixture list size; the fixtures page By Team view still uses the default of 8. */
export const TEAM_FIXTURE_PAGE_SIZE = 10;
/** Match-hub Team form list size per club. */
export const TEAM_FORM_LIMIT = 5;
/** Home overview row count at the 620px mobile breakpoint. */
export const OVERVIEW_MOBILE_ROWS = 10;

const SEASON_YEAR = /^(\d{4})\s*[/–-]\s*(\d{2}|\d{4})$/;

/** Compact football season, e.g. `2022/2023` → `2022/23`. */
export function seasonYearLabel(name: string): string {
  const matched = name.trim().match(SEASON_YEAR);
  if (!matched) return name;
  const start = matched[1];
  const rawEnd = matched[2];
  if (start === undefined || rawEnd === undefined) return name;
  const end = rawEnd.length === 4 ? rawEnd.slice(-2) : rawEnd;
  return `${start}/${end}`;
}

/** Two-digit campaign, e.g. `2025/2026` → `25/26`. */
export function seasonShortLabel(name: string): string {
  const compact = seasonYearLabel(name);
  const matched = compact.match(/^(\d{4})\/(\d{2})$/);
  if (!matched || matched[1] === undefined || matched[2] === undefined) return compact;
  return `${matched[1].slice(-2)}/${matched[2]}`;
}

/** Compact earliest stored season for Head-to-Head coverage, e.g. `2021/22`. */
export function headToHeadCoverageLabel(
  seasons: readonly { name: string; start_date: string }[],
): string | null {
  if (!seasons.length) return null;
  const earliest = [...seasons].sort((a, b) => a.start_date.localeCompare(b.start_date))[0]!;
  return seasonYearLabel(earliest.name);
}

export function roundOptionLabel(
  matchday: number,
  seasonName?: string,
  isCurrentSeason = true,
): string {
  if (isCurrentSeason || seasonName === undefined) return `Round ${matchday}`;
  return `Round ${matchday}, ${seasonYearLabel(seasonName)}`;
}

/** Match-hub caption. Historical seasons use Round plus the compact year. */
export function matchRoundLabel(
  competitionName: string,
  matchday: number | null,
  seasonName?: string,
  isCurrentSeason = true,
): string {
  const year =
    !isCurrentSeason && seasonName !== undefined ? `, ${seasonYearLabel(seasonName)}` : '';
  if (matchday === null) return `${competitionName}${year}`.trim();
  const roundWord = isCurrentSeason ? 'Matchday' : 'Round';
  return `${competitionName} ${roundWord} ${matchday}${year}`;
}

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

/** Schedule blocks sized to cover roughly two months of one team's league fixtures. */
export function groupByTwoMonthPeriod(fixtures: readonly Fixture[], size = 8): FixturePeriod[] {
  const sorted = [...fixtures].sort(byKickoff);
  if (!sorted.length) return [];
  const shortDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const datedYear = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const periods: FixturePeriod[] = [];
  for (let start = 0; start < sorted.length; start += size) {
    const periodFixtures = sorted.slice(start, start + size);
    const first = new Date(periodFixtures[0]!.kickoff_at);
    const last = new Date(periodFixtures[periodFixtures.length - 1]!.kickoff_at);
    const label =
      first.getUTCFullYear() === last.getUTCFullYear()
        ? `${shortDate.format(first)} – ${shortDate.format(last)}`
        : `${datedYear.format(first)} – ${datedYear.format(last)}`;
    periods.push({ key: String(periods.length), label, fixtures: periodFixtures });
  }
  return periods;
}

/**
 * The fixture block a visitor most likely wants: the one with the next unplayed match,
 * or the last block once every remaining fixture is completed or cancelled.
 */
export function defaultPeriodIndex(periods: readonly FixturePeriod[]): number {
  if (!periods.length) return 0;
  const upcoming = periods.findIndex((period) =>
    period.fixtures.some(
      (fixture) => fixture.status !== 'completed' && fixture.status !== 'cancelled',
    ),
  );
  return upcoming >= 0 ? upcoming : periods.length - 1;
}

/** Accepts an untrusted query value and falls back to the default fixture block. */
export function resolvePeriodIndex(
  periods: readonly FixturePeriod[],
  requested: string | string[] | undefined,
): number {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  if (raw !== undefined && /^\d{1,2}$/.test(raw)) {
    const parsed = Number.parseInt(raw, 10);
    if (parsed >= 0 && parsed < periods.length) return parsed;
  }
  return defaultPeriodIndex(periods);
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

/** Recalculates and ranks standings from only home or away results. */
export function standingsByVenue(
  standings: readonly Standing[],
  fixtures: readonly Fixture[],
  venue: Exclude<VenueFilter, 'all'>,
): Standing[] {
  const totals = new Map<string, Standing>(
    standings.map((standing) => [
      standing.team_id,
      {
        ...standing,
        position: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goals_for: 0,
        goals_against: 0,
        goal_difference: 0,
        points: 0,
      },
    ]),
  );

  for (const fixture of fixtures.filter(isPlayed)) {
    const isHome = venue === 'home';
    const teamId = isHome ? fixture.home_team_id : fixture.away_team_id;
    const row = totals.get(teamId);
    if (!row) continue;

    const goalsFor = isHome ? fixture.home_score! : fixture.away_score!;
    const goalsAgainst = isHome ? fixture.away_score! : fixture.home_score!;
    row.played += 1;
    row.goals_for += goalsFor;
    row.goals_against += goalsAgainst;
    row.goal_difference = row.goals_for - row.goals_against;
    if (goalsFor > goalsAgainst) row.won += 1;
    else if (goalsFor === goalsAgainst) row.drawn += 1;
    else row.lost += 1;
    row.points = row.won * 3 + row.drawn;
  }

  return [...totals.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.goal_difference - a.goal_difference ||
        b.goals_for - a.goals_for ||
        a.team_name.localeCompare(b.team_name),
    )
    .map((standing, index) => ({ ...standing, position: index + 1 }));
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

export type TeamFormMatch = {
  fixture: Fixture;
  result: ResultMark;
  isHome: boolean;
};

function resultFor(fixture: Fixture, teamId: string): ResultMark {
  const isHome = fixture.home_team_id === teamId;
  const scored = isHome ? fixture.home_score! : fixture.away_score!;
  const conceded = isHome ? fixture.away_score! : fixture.home_score!;
  if (scored > conceded) return 'W';
  if (scored < conceded) return 'L';
  return 'D';
}

/** Newest completed league results for one club, capped at `limit`. */
export function recentTeamForm(
  fixtures: readonly Fixture[],
  teamId: string,
  limit = TEAM_FORM_LIMIT,
  excludeFixtureId?: string,
): TeamFormMatch[] {
  return fixtures
    .filter(isPlayed)
    .filter((fixture) => fixture.home_team_id === teamId || fixture.away_team_id === teamId)
    .filter((fixture) => fixture.id !== excludeFixtureId)
    .sort((a, b) => b.kickoff_at.localeCompare(a.kickoff_at))
    .slice(0, limit)
    .map((fixture) => ({
      fixture,
      result: resultFor(fixture, teamId),
      isHome: fixture.home_team_id === teamId,
    }));
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
