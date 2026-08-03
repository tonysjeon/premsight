import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { Table } from '@/components/table';
export const metadata: Metadata = { title: 'League table' };
export const dynamic = 'force-dynamic';
export default async function TablePage() {
  const season = await api.currentSeason();
  const items = await api.standings(season.id);
  return (
    <main className="wrap page">
      <p className="eyebrow">{season.name}</p>
      <h1>League table</h1>
      <p className="page-lede">Three points for a win. Every completed match accounted for.</p>
      <Table items={items} />
    </main>
  );
}
