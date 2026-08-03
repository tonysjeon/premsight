import type { Metadata } from 'next';
import { MatchList } from '@/components/match-list';
import { api } from '@/lib/api';
export const metadata: Metadata = { title: 'Fixtures' };
export const dynamic = 'force-dynamic';
export default async function Fixtures() {
  const season = await api.currentSeason();
  const items = await api.fixtures(`season_id=${season.id}`);
  return (
    <main className="wrap page">
      <p className="eyebrow">{season.name}</p>
      <h1>Fixtures & results</h1>
      <p className="page-lede">The full season, from opening weekend to the final whistle.</p>
      <MatchList items={items} empty="No fixtures have been imported." />
    </main>
  );
}
