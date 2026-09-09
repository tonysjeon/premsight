import assert from 'node:assert/strict';
import test from 'node:test';
import { setFavorite } from './favorite-state.ts';

test('reverting a failed save preserves other concurrent saves', () => {
  const a = { id: 'a' };
  const b = { id: 'b' };
  const saved = setFavorite(setFavorite([], a, true), b, true);
  assert.deepEqual(setFavorite(saved, a, false), [b]);
  assert.deepEqual(saved, [a, b]);
});

test('reverting a removal restores the item without duplicating existing favorites', () => {
  const a = { id: 'a' };
  const restored = setFavorite(setFavorite([a], a, false), a, true);
  assert.deepEqual(setFavorite(restored, a, true), [a]);
});
