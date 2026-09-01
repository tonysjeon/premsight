import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiBase } from './api-base.ts';

test('server prefers INTERNAL_API_URL over NEXT_PUBLIC_API_URL', () => {
  assert.equal(
    getApiBase({
      INTERNAL_API_URL: 'http://api:8000',
      NEXT_PUBLIC_API_URL: 'http://localhost:8000',
    }),
    'http://api:8000',
  );
});

test('falls back to NEXT_PUBLIC_API_URL then localhost', () => {
  assert.equal(
    getApiBase({ NEXT_PUBLIC_API_URL: 'https://api.example.com' }),
    'https://api.example.com',
  );
  assert.equal(getApiBase({}), 'http://localhost:8000');
});

test('strips trailing slashes from API origins', () => {
  assert.equal(
    getApiBase({
      INTERNAL_API_URL: 'https://api.example.com/',
      NEXT_PUBLIC_API_URL: 'https://ignored.example.com/',
    }),
    'https://api.example.com',
  );
  assert.equal(
    getApiBase({ NEXT_PUBLIC_API_URL: 'https://api.example.com///' }),
    'https://api.example.com',
  );
});
