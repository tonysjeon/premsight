import assert from 'node:assert/strict';
import test from 'node:test';
import {
  headToHeadMeetings,
  headToHeadRecord,
  isCurrentWeekMatch,
  kickoffCountdown,
  resolveH2hScope,
  resolveMatchTab,
  scopedHeadToHeadMeetings,
} from './match.ts';

function fixture(overrides = {}) {
  return {
    id: 'current',
    home_team_id: 'home',
    home_team_name: 'Home',
    away_team_id: 'away',
    away_team_name: 'Away',
    status: 'completed',
    kickoff_at: '2026-01-01T15:00:00Z',
    matchday: 1,
    home_score: 1,
    away_score: 0,
    venue: 'Home Park',
    season_id: 'season',
    ...overrides,
  };
}

test('falls back to preview for missing or unknown tabs when preview is available', () => {
  assert.equal(resolveMatchTab(undefined, true), 'preview');
  assert.equal(resolveMatchTab('lineup', true), 'preview');
  assert.equal(resolveMatchTab(['table', 'h2h'], true), 'table');
  assert.equal(resolveMatchTab('h2h', true), 'h2h');
});

test('falls back to table and removes preview when preview is not available', () => {
  assert.equal(resolveMatchTab(undefined, false), 'table');
  assert.equal(resolveMatchTab('preview', false), 'table');
  assert.equal(resolveMatchTab('table', false), 'table');
  assert.equal(resolveMatchTab('h2h', false), 'h2h');
});

test('isCurrentWeekMatch checks if fixture belongs to the active upcoming matchday', () => {
  const seasonFixtures = [
    fixture({ id: 'f1', matchday: 1, status: 'completed', home_score: 2, away_score: 0 }),
    fixture({ id: 'f2', matchday: 2, status: 'scheduled', home_score: null, away_score: null }),
    fixture({ id: 'f3', matchday: 3, status: 'scheduled', home_score: null, away_score: null }),
  ];

  const currentWeekMatch = fixture({ id: 'f2', matchday: 2, status: 'scheduled', home_score: null, away_score: null });
  const futureWeekMatch = fixture({ id: 'f3', matchday: 3, status: 'scheduled', home_score: null, away_score: null });
  const completedMatch = fixture({ id: 'f1', matchday: 1, status: 'completed', home_score: 2, away_score: 0 });

  assert.equal(isCurrentWeekMatch(currentWeekMatch, seasonFixtures, true), true);
  assert.equal(isCurrentWeekMatch(futureWeekMatch, seasonFixtures, true), false);
  assert.equal(isCurrentWeekMatch(completedMatch, seasonFixtures, true), false);
  assert.equal(isCurrentWeekMatch(currentWeekMatch, seasonFixtures, false), false);
});

test('formats a request-time countdown from remaining kickoff time', () => {
  assert.equal(kickoffCountdown('2026-08-30T15:00:00Z', '2026-08-27T15:00:00Z'), '3 days');
  assert.equal(kickoffCountdown('2026-08-28T15:00:00Z', '2026-08-27T15:00:00Z'), 'Tomorrow');
  assert.equal(kickoffCountdown('2026-08-27T20:00:00Z', '2026-08-27T15:00:00Z'), 'Today');
  assert.equal(kickoffCountdown('2026-08-27T15:40:00Z', '2026-08-27T15:00:00Z'), 'Today');
  assert.equal(kickoffCountdown('2026-08-27T14:00:00Z', '2026-08-27T15:00:00Z'), null);
});

test('lists prior completed meetings between the two clubs', () => {
  const meetings = headToHeadMeetings(
    [
      fixture({
        id: 'current',
        kickoff_at: '2026-08-30T15:00:00Z',
        status: 'scheduled',
        home_score: null,
        away_score: null,
      }),
      fixture({ id: 'old-home', kickoff_at: '2026-01-10T15:00:00Z', home_score: 2, away_score: 1 }),
      fixture({
        id: 'old-away',
        kickoff_at: '2026-05-10T15:00:00Z',
        home_team_id: 'away',
        home_team_name: 'Away',
        away_team_id: 'home',
        away_team_name: 'Home',
        home_score: 0,
        away_score: 0,
      }),
      fixture({ id: 'other', home_team_id: 'home', away_team_id: 'other' }),
      fixture({
        id: 'future',
        kickoff_at: '2027-01-01T15:00:00Z',
        status: 'scheduled',
        home_score: null,
        away_score: null,
      }),
    ],
    'home',
    'away',
    'current',
  );

  assert.deepEqual(
    meetings.map((item) => item.id),
    ['old-away', 'old-home'],
  );
});

test('summarises head-to-head wins from the current home side', () => {
  assert.deepEqual(
    headToHeadRecord(
      [
        fixture({ home_score: 2, away_score: 1 }),
        fixture({
          home_team_id: 'away',
          away_team_id: 'home',
          home_score: 3,
          away_score: 0,
        }),
        fixture({ home_score: 1, away_score: 1 }),
      ],
      'home',
      'away',
    ),
    { homeWins: 1, draws: 1, awayWins: 1 },
  );
});

test('defaults the head-to-head scope to this tournament', () => {
  assert.equal(resolveH2hScope(undefined), 'tournament');
  assert.equal(resolveH2hScope('away'), 'tournament');
  assert.equal(resolveH2hScope('home'), 'home');
  assert.equal(resolveH2hScope(['home']), 'home');
});

test('home scope keeps only meetings hosted by the current home side', () => {
  const meetings = [
    fixture({ id: 'at-home', home_team_id: 'home', away_team_id: 'away' }),
    fixture({
      id: 'at-away',
      home_team_id: 'away',
      away_team_id: 'home',
    }),
  ];
  assert.deepEqual(
    scopedHeadToHeadMeetings(meetings, 'home', 'home').map((item) => item.id),
    ['at-home'],
  );
  assert.deepEqual(
    scopedHeadToHeadMeetings(meetings, 'home', 'tournament').map((item) => item.id),
    ['at-home', 'at-away'],
  );
});
