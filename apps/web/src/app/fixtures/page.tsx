import type { Metadata } from 'next';
import { Card } from '@/components/card';
import { MatchList } from '@/components/match-list';
import { api } from '@/lib/api';
import { buildTeamDirectory } from '@/lib/teams';

export const metadata: Metadata = { title: 'Fixtures' };
export const dynamic = 'force-dynamic';

export default async function Fixtures() {
  const season = await api.currentSeason();
  const [items, teams] = await Promise.all([
    api.fixtures(`season_id=${season.id}`),
    api.teams(`season_id=${season.id}`),
  ]);
  return (
    <main className="shell page">
      <p className="eyebrow">{season.name}</p>
      <h1>Fixtures &amp; results</h1>
      <p className="page-lede">The full season, from opening weekend to the final whistle.</p>
      <Card flush note={`${items.length} matches`} title="Every match">
        <MatchList
          empty="No fixtures have been imported."
          items={items}
          teams={buildTeamDirectory(teams)}
        />
      </Card>
    </main>
  );
}
