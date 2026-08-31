import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldSoftNavigate, withReplacedParams } from './client-nav.ts';

test('shouldSoftNavigate ignores modified or non-primary clicks', () => {
  assert.equal(
    shouldSoftNavigate({
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      button: 0,
    }),
    true,
  );
  assert.equal(
    shouldSoftNavigate({
      metaKey: true,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      button: 0,
    }),
    false,
  );
  assert.equal(
    shouldSoftNavigate({
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      button: 1,
    }),
    false,
  );
});

test('withReplacedParams updates and drops empty query keys', () => {
  assert.equal(
    withReplacedParams('/table', 'season=2025-26', { venue: 'home' }),
    '/table?season=2025-26&venue=home',
  );
  assert.equal(
    withReplacedParams('/table', 'season=2025-26&venue=home', { venue: null }),
    '/table?season=2025-26',
  );
  assert.equal(withReplacedParams('/compare', '', { tab: null }), '/compare');
});
