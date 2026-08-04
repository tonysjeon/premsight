import type { Metadata } from 'next';
import { Card } from '@/components/card';
import { Table, TableLegend } from '@/components/table';
import { api } from '@/lib/api';
import { formTable } from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

export const metadata: Metadata = { title: 'League table' };
export const dynamic = 'force-dynamic';

export default async function TablePage() {
  const season = await api.currentSeason();
  const [items, fixtures, teams] = await Promise.all([
    api.standings(season.id),
    api.fixtures(`season_id=${season.id}`),
    api.teams(`season_id=${season.id}`),
  ]);
  return (
    <main className="shell page">
      <p className="eyebrow">{season.name}</p>
      <h1>League table</h1>
      <p className="page-lede">Three points for a win. Every completed match accounted for.</p>
      <Card flush note={`${items.length} teams`} title="Standings">
        {items.length ? (
          <>
            <Table form={formTable(fixtures)} items={items} teams={buildTeamDirectory(teams)} />
            <TableLegend />
          </>
        ) : (
          <p className="empty">The table appears once matches are played.</p>
        )}
      </Card>
    </main>
  );
}
