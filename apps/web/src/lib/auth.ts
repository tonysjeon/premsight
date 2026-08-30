import { getApiBase } from '@/lib/api-base';
import {
  cachedUserRequest,
  clearCurrentUserCache,
  rememberCurrentUser,
  type AuthUser,
} from '@/lib/auth-session';
import { type AuthProvider, oauthStartPath } from '@/lib/oauth-url';

export type { AuthUser } from '@/lib/auth-session';
export { peekCurrentUser, rememberCurrentUser } from '@/lib/auth-session';
export type { AuthProvider };

export function oauthStartUrl(provider: AuthProvider, returnTo: string): string {
  return oauthStartPath(getApiBase(), provider, returnTo);
}

export type AuthProviders = {
  google: boolean;
};

const listeners = new Set<() => void>();

export function subscribeAuth(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function notifyAuthChanged() {
  clearCurrentUserCache();
  listeners.forEach((listener) => listener());
}

async function authRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (response.status === 204) return undefined as T;
  if (!response.ok) {
    const detail = await readError(response);
    throw new AuthError(detail, response.status);
  }
  return response.json() as Promise<T>;
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown };
    if (typeof payload.detail === 'string') return payload.detail;
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401) return 'Not signed in';
  if (response.status === 503) return 'This sign-in option is not configured yet';
  return 'Something went wrong. Please try again.';
}

export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export function fetchCurrentUser(): Promise<AuthUser | null> {
  return cachedUserRequest(() =>
    authRequest<AuthUser>('/v1/auth/me')
      .then((user) => rememberCurrentUser(user))
      .catch((error: unknown) => {
        if (error instanceof AuthError && error.status === 401) return rememberCurrentUser(null);
        throw error;
      }),
  );
}

export function fetchAuthProviders(): Promise<AuthProviders> {
  return authRequest<AuthProviders>('/v1/auth/providers');
}

export function signOut(): Promise<void> {
  return authRequest<void>('/v1/auth/logout', { method: 'POST' });
}

export function deleteAccount(): Promise<void> {
  return authRequest<void>('/v1/auth/me', { method: 'DELETE' });
}

async function endSessionAndReloadHome(task: () => Promise<void>): Promise<void> {
  await task().catch(() => undefined);
  clearCurrentUserCache();
  window.location.assign('/');
}

export function signOutToHome(): Promise<void> {
  return endSessionAndReloadHome(signOut);
}

export function deleteAccountToHome(): Promise<void> {
  return endSessionAndReloadHome(deleteAccount);
}
