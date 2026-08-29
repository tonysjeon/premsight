import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveSeason,
  seasonPublicId,
  seasonSlug,
  teamPath,
  teamPublicId,
  withSeasonQuery,
} from './public-id.ts';
import { buildTeamDirectory } from './teams.ts';

test('seasonSlug uses compact campaign years', () => {
  assert.equal(seasonSlug('2026/2027'), '2026-27');
  assert.equal(seasonSlug('2022-23'), '2022-23');
});

test('resolveSeason accepts slug or uuid and keeps uuid fallback', () => {
  const current = {
    id: 'uuid-2026',
    name: '2026/2027',
    competition_name: 'Premier League',
    start_date: '2026-08-14',
    end_date: '2027-05-31',
    is_current: true,
  };
  const previous = {
    ...current,
    id: 'uuid-2025',
    name: '2025/2026',
    is_current: false,
  };
  assert.equal(resolveSeason([current, previous], '2026-27', previous).id, 'uuid-2026');
  assert.equal(resolveSeason([current, previous], 'uuid-2025', current).id, 'uuid-2025');
  assert.equal(resolveSeason([current, previous], 'missing', current).id, 'uuid-2026');
  assert.equal(seasonPublicId(current), '2026-27');
  assert.equal(
    withSeasonQuery('/table', current, { venue: 'home' }),
    '/table?season=2026-27&venue=home',
  );
});

test('teamPublicId prefers TLA and teamPath looks up the directory', () => {
  const directory = buildTeamDirectory([
    {
      id: 'uuid-ars',
      name: 'Arsenal',
      short_name: 'Arsenal',
      tla: 'ARS',
      crest_url: null,
    },
  ]);
  assert.equal(teamPublicId({ id: 'uuid-ars', tla: 'ARS' }), 'ars');
  assert.equal(teamPath(directory, 'uuid-ars'), '/teams/ars');
  assert.equal(teamPath(undefined, 'uuid-ars'), '/teams/uuid-ars');
});
