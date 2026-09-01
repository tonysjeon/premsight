import type { Metadata } from 'next';
import { Card } from '@/components/card';
import { PlayerCompare } from '@/components/player-compare';
import { loadScoutPlayers } from '@/lib/football-load';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export const metadata: Metadata = {
  title: 'Player Comparison · PremSight',
  description:
    'Search two Premier League players, overlay their style radar, and compare k-means archetypes.',
};

export default async function ComparePage() {
  const catalog = await loadScoutPlayers();
  return (
    <main className="shell home-page page compare-page">
      <h1 className="sr-only">Player compare</h1>
      <div className="compare-page-overview">
        <Card flush>
          <PlayerCompare initialCatalog={catalog} />
        </Card>
      </div>
    </main>
  );
}
