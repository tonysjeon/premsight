import assert from 'node:assert/strict';
import test from 'node:test';
import { tabIndicatorPosition } from './tab-indicator.ts';

test('tabIndicatorPosition is relative to the tab list including scroll', () => {
  assert.deepEqual(tabIndicatorPosition(100, 0, 140, 48), { left: 40, width: 48 });
  assert.deepEqual(tabIndicatorPosition(100, 20, 140, 64), { left: 60, width: 64 });
});
