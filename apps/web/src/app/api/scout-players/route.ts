import { getApiBase } from '@/lib/api-base';

export const dynamic = 'force-dynamic';

export async function GET() {
  const response = await fetch(`${getApiBase()}/v1/players?has_stats=true`, {
    cache: 'no-store',
  });
  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      'content-type': response.headers.get('content-type') ?? 'application/json',
    },
  });
}
