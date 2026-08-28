import assert from 'node:assert/strict';
import test from 'node:test';
import { buildTeamDirectory, matchDocumentTitle, shortenName } from './teams.ts';

test('shortenName drops FC boilerplate', () => {
  assert.equal(shortenName('Arsenal FC'), 'Arsenal');
  assert.equal(shortenName('Brighton and Hove Albion'), 'Brighton and Hove Albion');
});

test('matchDocumentTitle uses the same display labels as the match board', () => {
  const directory = buildTeamDirectory([
    {
      id: 'bha',
      name: 'Brighton & Hove Albion FC',
      short_name: 'Brighton',
      tla: 'BHA',
      crest_url: null,
    },
    {
      id: 'not',
      name: 'Nottingham Forest FC',
      short_name: "Nott'm Forest",
      tla: 'NOT',
      crest_url: null,
    },
  ]);
  assert.equal(
    matchDocumentTitle(
      directory,
      'bha',
      'Brighton & Hove Albion FC',
      'not',
      'Nottingham Forest FC',
    ),
    "Brighton vs Nott'm Forest",
  );
  assert.equal(matchDocumentTitle(undefined, 'a', 'Arsenal FC', 'c', 'Chelsea FC'), 'Arsenal vs Chelsea');
});
