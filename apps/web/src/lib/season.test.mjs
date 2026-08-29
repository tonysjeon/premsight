import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TEAM_FIXTURE_PAGE_SIZE,
  TEAM_FORM_LIMIT,
  OVERVIEW_MOBILE_ROWS,
  defaultPeriodIndex,
  formTable,
  groupByTwoMonthPeriod,
  headToHeadCoverageLabel,
  matchRoundLabel,
  recentTeamForm,
  resolvePeriodIndex,
  roundOptionLabel,
  seasonYearLabel,
} from './season.ts';

function match(overrides = {}) {
  return {
    id: 'match-1',
    home_team_id: 'ARS',
    home_team_name: 'Arsenal',
    away_team_id: 'CHE',
    away_team_name: 'Chelsea',
    status: 'completed',
    kickoff_at: '2026-08-15T14:00:00Z',
    matchday: 1,
    home_score: 2,
    away_score: 1,
    venue: 'Emirates Stadium',
    season_id: 'pl-2026',
    ...overrides,
  };
}

test('formTable limits results and puts the most recent match rightmost', () => {
  const fixtures = [
    match({
      id: 'm1',
      kickoff_at: '2026-08-15T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'CHE',
      home_score: 2,
      away_score: 1, // ARS W, CHE L
    }),
    match({
      id: 'm2',
      kickoff_at: '2026-08-22T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'LIV',
      home_score: 1,
      away_score: 1, // ARS D, LIV D
    }),
    match({
      id: 'm3',
      kickoff_at: '2026-08-29T14:00:00Z',
      home_team_id: 'MCI',
      away_team_id: 'ARS',
      home_score: 3,
      away_score: 1, // ARS L, MCI W
    }),
    match({
      id: 'm4',
      kickoff_at: '2026-09-05T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'TOT',
      home_score: 3,
      away_score: 0, // ARS W, TOT L (newest completed)
    }),
    match({
      id: 'm5',
      kickoff_at: '2026-09-12T14:00:00Z',
      home_team_id: 'MUN',
      away_team_id: 'ARS',
      status: 'scheduled',
      home_score: null,
      away_score: null, // Unplayed
    }),
  ];

  const form = formTable(fixtures, 3);
  // Arsenal played 4 games: W (m1), D (m2), L (m3), W (m4).
  // Capped at 3: ['D', 'L', 'W'], where 'W' (rightmost) is the most recent one.
  assert.deepEqual(form.get('ARS'), ['D', 'L', 'W']);
  assert.deepEqual(form.get('CHE'), ['L']);
  assert.equal(form.get('MUN'), undefined);
  assert.deepEqual(formTable(fixtures).get('ARS'), ['W', 'D', 'L', 'W']);
});

test('recentTeamForm lists newest completed matches first and skips the open fixture', () => {
  const fixtures = [
    match({
      id: 'm1',
      kickoff_at: '2026-08-15T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'CHE',
      home_score: 2,
      away_score: 1,
    }),
    match({
      id: 'm2',
      kickoff_at: '2026-08-22T14:00:00Z',
      home_team_id: 'LIV',
      away_team_id: 'ARS',
      home_score: 3,
      away_score: 1,
    }),
    match({
      id: 'm3',
      kickoff_at: '2026-08-29T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'TOT',
      home_score: 0,
      away_score: 0,
    }),
    match({
      id: 'open',
      kickoff_at: '2026-09-05T14:00:00Z',
      home_team_id: 'ARS',
      away_team_id: 'MCI',
      status: 'scheduled',
      home_score: null,
      away_score: null,
    }),
  ];

  const form = recentTeamForm(fixtures, 'ARS', 5, 'open');
  assert.deepEqual(
    form.map((entry) => [entry.fixture.id, entry.result, entry.isHome]),
    [
      ['m3', 'D', true],
      ['m2', 'L', false],
      ['m1', 'W', true],
    ],
  );
  assert.equal(recentTeamForm(fixtures, 'ARS', 2, 'open').length, 2);
  assert.deepEqual(recentTeamForm(fixtures, 'MUN', 5), []);
});

test('recentTeamForm caps each club at five matches', () => {
  const fixtures = Array.from({ length: 6 }, (_, index) =>
    match({
      id: `m${index + 1}`,
      kickoff_at: `2026-08-${String(15 + index).padStart(2, '0')}T14:00:00Z`,
    }),
  );
  assert.equal(recentTeamForm(fixtures, 'ARS').length, TEAM_FORM_LIMIT);
  assert.equal(TEAM_FORM_LIMIT, 5);
  assert.equal(OVERVIEW_MOBILE_ROWS, 10);
});

test('seasonYearLabel shortens a four-digit season span', () => {
  assert.equal(seasonYearLabel('2022/2023'), '2022/23');
  assert.equal(seasonYearLabel('2022/23'), '2022/23');
  assert.equal(seasonYearLabel('2026/2027'), '2026/27');
  assert.equal(seasonYearLabel('Premier League'), 'Premier League');
});

test('roundOptionLabel adds the compact season only for historical seasons', () => {
  assert.equal(roundOptionLabel(3, '2022/2023', true), 'Round 3');
  assert.equal(roundOptionLabel(3, '2022/2023', false), 'Round 3, 2022/23');
  assert.equal(roundOptionLabel(3, undefined, false), 'Round 3');
});

test('matchRoundLabel uses Matchday now and Round plus year for past seasons', () => {
  assert.equal(
    matchRoundLabel('Premier League', 2, '2026/2027', true),
    'Premier League Matchday 2',
  );
  assert.equal(
    matchRoundLabel('Premier League', 12, '2022/2023', false),
    'Premier League Round 12, 2022/23',
  );
  assert.equal(
    matchRoundLabel('Premier League', null, '2022/2023', false),
    'Premier League, 2022/23',
  );
  assert.equal(matchRoundLabel('Premier League', null, '2026/2027', true), 'Premier League');
});

test("groupByTwoMonthPeriod paginates a team's fixtures into labelled blocks", () => {
  const fixtures = Array.from({ length: 21 }, (_, index) =>
    match({
      id: `m${index + 1}`,
      kickoff_at: new Date(Date.UTC(2026, 7, 15 + index, 14)).toISOString(),
    }),
  );
  const pages = groupByTwoMonthPeriod(fixtures, TEAM_FIXTURE_PAGE_SIZE);
  assert.equal(pages.length, 3);
  assert.equal(pages[0].fixtures.length, 10);
  assert.equal(pages[1].fixtures.length, 10);
  assert.equal(pages[2].fixtures.length, 1);
  assert.equal(pages[0].label, 'Aug 15 – Aug 24');
});

test('resolvePeriodIndex prefers the block with the next unplayed fixture', () => {
  const periods = groupByTwoMonthPeriod(
    [
      match({ id: 'played', kickoff_at: '2026-08-15T14:00:00Z' }),
      match({
        id: 'next',
        kickoff_at: '2026-09-15T14:00:00Z',
        status: 'scheduled',
        home_score: null,
        away_score: null,
      }),
      match({
        id: 'later',
        kickoff_at: '2026-10-15T14:00:00Z',
        status: 'scheduled',
        home_score: null,
        away_score: null,
      }),
    ],
    1,
  );
  assert.equal(defaultPeriodIndex(periods), 1);
  assert.equal(resolvePeriodIndex(periods, '0'), 0);
  assert.equal(resolvePeriodIndex(periods, '9'), 1);
  assert.equal(resolvePeriodIndex(periods, 'nope'), 1);
});

test('defaultPeriodIndex uses the last block when the season is complete', () => {
  const periods = groupByTwoMonthPeriod(
    [
      match({ id: 'm1', kickoff_at: '2026-08-15T14:00:00Z' }),
      match({ id: 'm2', kickoff_at: '2026-09-15T14:00:00Z' }),
    ],
    1,
  );
  assert.equal(defaultPeriodIndex(periods), 1);
  assert.equal(defaultPeriodIndex([]), 0);
});

test('headToHeadCoverageLabel uses the earliest stored season', () => {
  assert.equal(headToHeadCoverageLabel([]), null);
  assert.equal(
    headToHeadCoverageLabel([{ name: '2026/2027', start_date: '2026-08-14' }]),
    '2026/27',
  );
  assert.equal(
    headToHeadCoverageLabel([
      { name: '2026/2027', start_date: '2026-08-14' },
      { name: '2021/2022', start_date: '2021-08-13' },
      { name: '2022/2023', start_date: '2022-08-05' },
    ]),
    '2021/22',
  );
});
