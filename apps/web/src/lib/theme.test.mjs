import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_THEME, getServerThemeSnapshot, isTheme, subscribeTheme } from './theme.ts';

test('isTheme accepts light and dark', () => {
  assert.equal(isTheme('light'), true);
  assert.equal(isTheme('dark'), true);
  assert.equal(isTheme('system'), false);
  assert.equal(isTheme(null), false);
});

test('server snapshot matches the default theme', () => {
  assert.equal(getServerThemeSnapshot(), DEFAULT_THEME);
});

test('subscribeTheme notifies until unsubscribed', () => {
  const seen = [];
  const unsubscribe = subscribeTheme(() => seen.push('change'));
  unsubscribe();
  assert.deepEqual(seen, []);
});
