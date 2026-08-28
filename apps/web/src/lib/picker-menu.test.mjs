import assert from 'node:assert/strict';
import test from 'node:test';
import { pickerMenuScrollTop } from './picker-menu.ts';

test('pickerMenuScrollTop centers the active option without going negative', () => {
  assert.equal(pickerMenuScrollTop(0, 32, 240), 0);
  assert.equal(pickerMenuScrollTop(600, 32, 240), 496);
});
