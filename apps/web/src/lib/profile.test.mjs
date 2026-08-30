import assert from 'node:assert/strict';
import test from 'node:test';
import { profileInitials } from './profile.ts';

test('builds avatar initials from the display name', () => {
  assert.equal(profileInitials('Tony Jeon'), 'TJ');
  assert.equal(profileInitials('Fan'), 'F');
  assert.equal(profileInitials('  '), '?');
});
