const LOCAL_API = 'http://localhost:8000';

function trimOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '');
}

export function getApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const isServer = typeof window === 'undefined';
  // Direct process.env.NEXT_PUBLIC_* access so Next.js inlines it in the browser bundle.
  // Reading it only via the `env` argument is stripped in production client builds.
  const inlinedPublic = trimOrigin(process.env.NEXT_PUBLIC_API_URL);
  if (!isServer) {
    return inlinedPublic ?? LOCAL_API;
  }
  return (
    trimOrigin(env.INTERNAL_API_URL) ??
    trimOrigin(env.NEXT_PUBLIC_API_URL) ??
    inlinedPublic ??
    LOCAL_API
  );
}
