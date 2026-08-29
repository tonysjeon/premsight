import assert from 'node:assert/strict';
import test from 'node:test';
import { isTheme } from './theme.ts';

test('isTheme accepts light and dark', () => {
  assert.equal(isTheme('light'), true);
  assert.equal(isTheme('dark'), true);
  assert.equal(isTheme('system'), false);
  assert.equal(isTheme(null), false);
});
