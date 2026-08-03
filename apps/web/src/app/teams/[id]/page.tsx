import type { Metadata } from 'next';
import { MatchList } from '@/components/match-list';
import { api } from '@/lib/api';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await api.team((await params).id)).name };
}
export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const team = await api.team((await params).id);
  return (
    <main className="wrap page">
      <p className="eyebrow">{team.tla ?? 'Premier League club'}</p>
      <h1>{team.name}</h1>
      <p className="page-lede">Recent results and upcoming fixtures.</p>
      <MatchList items={team.fixtures ?? []} empty="No fixtures found for this team." />
    </main>
  );
}
