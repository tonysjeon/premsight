export type AuthUser = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  provider: string;
  provider_user_id: string;
};

let cachedUser: AuthUser | null | undefined = undefined;
let inFlight: Promise<AuthUser | null> | null = null;

export function peekCurrentUser(): AuthUser | null | undefined {
  return cachedUser;
}

export function rememberCurrentUser(user: AuthUser | null): AuthUser | null {
  cachedUser = user;
  inFlight = null;
  return user;
}

export function clearCurrentUserCache(): void {
  cachedUser = undefined;
  inFlight = null;
}

export function cachedUserRequest(load: () => Promise<AuthUser | null>): Promise<AuthUser | null> {
  if (cachedUser !== undefined) return Promise.resolve(cachedUser);
  if (inFlight) return inFlight;
  inFlight = load().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
