import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cachedUserRequest,
  clearCurrentUserCache,
  peekCurrentUser,
  rememberCurrentUser,
} from './auth-session.ts';
import { oauthStartPath } from './oauth-url.ts';

test('oauthStartPath sends the current page back to the API', () => {
  assert.equal(
    oauthStartPath('http://localhost:8000', 'google', 'http://localhost:3000/table'),
    'http://localhost:8000/v1/auth/google/start?return_to=http%3A%2F%2Flocalhost%3A3000%2Ftable',
  );
});

test('rememberCurrentUser caches the session until the cache is cleared', () => {
  clearCurrentUserCache();
  rememberCurrentUser({
    id: 'user-1',
    email: 'fan@example.com',
    display_name: 'Fan',
    avatar_url: null,
    provider: 'google',
    provider_user_id: 'abc',
  });
  assert.equal(peekCurrentUser()?.display_name, 'Fan');
  clearCurrentUserCache();
  assert.equal(peekCurrentUser(), undefined);
});

test('cachedUserRequest reuses an in-flight load', async () => {
  clearCurrentUserCache();
  let loads = 0;
  const load = () => {
    loads += 1;
    return Promise.resolve({
      id: 'user-1',
      email: 'fan@example.com',
      display_name: 'Fan',
      avatar_url: null,
      provider: 'google',
      provider_user_id: 'abc',
    });
  };
  const first = cachedUserRequest(load);
  const second = cachedUserRequest(load);
  rememberCurrentUser(await first);
  assert.equal(await second, await first);
  assert.equal(loads, 1);
  clearCurrentUserCache();
});
