import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveTeamTab } from './team-page.ts';

test('falls back to fixtures for missing or unknown team tabs', () => {
  assert.equal(resolveTeamTab(undefined), 'fixtures');
  assert.equal(resolveTeamTab('overview'), 'fixtures');
  assert.equal(resolveTeamTab(['table', 'roster']), 'table');
  assert.equal(resolveTeamTab('table'), 'table');
  assert.equal(resolveTeamTab('roster'), 'roster');
});
