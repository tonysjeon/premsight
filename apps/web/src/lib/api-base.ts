export function getApiBase(env: NodeJS.ProcessEnv = process.env): string {
  const isServer = typeof window === 'undefined';
  const chosen = isServer
    ? (env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_API_URL)
    : env.NEXT_PUBLIC_API_URL;
  return chosen ?? 'http://localhost:8000';
}
