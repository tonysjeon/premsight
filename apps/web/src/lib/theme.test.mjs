import assert from 'node:assert/strict';
import test from 'node:test';
import { nextTheme } from './theme.ts';

test('nextTheme toggles light and dark', () => {
  assert.equal(nextTheme('dark'), 'light');
  assert.equal(nextTheme('light'), 'dark');
});
