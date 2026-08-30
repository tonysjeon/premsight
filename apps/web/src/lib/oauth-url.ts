export type AuthProvider = 'google';

export function oauthStartPath(apiBase: string, provider: AuthProvider, returnTo: string): string {
  const params = new URLSearchParams({ return_to: returnTo });
  return `${apiBase}/v1/auth/${provider}/start?${params.toString()}`;
}
