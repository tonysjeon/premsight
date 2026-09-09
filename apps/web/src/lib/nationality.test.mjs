import assert from 'node:assert/strict';
import test from 'node:test';
import { nationalityName } from './nationality.ts';

test('names football nations and standard country codes', () => {
  assert.equal(nationalityName('EN'), 'England');
  assert.equal(nationalityName('S1'), 'Scotland');
  assert.equal(nationalityName('WA'), 'Wales');
  assert.equal(nationalityName('IT'), 'Italy');
  assert.equal(nationalityName('ar'), 'Argentina');
  assert.equal(nationalityName(null), 'Unknown');
  assert.equal(nationalityName('invalid'), 'Unknown');
});
