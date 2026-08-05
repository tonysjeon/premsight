import type { Metadata } from 'next';
import { randomUUID } from 'node:crypto';
import { DraftSimulator } from '@/components/draft-simulator';
import { currentDraftPlayers } from '@/lib/fpl';

export const metadata: Metadata = { title: 'Draft XI' };
export const dynamic = 'force-dynamic';

export default async function DraftPage() {
  const players = await currentDraftPlayers().catch(() => null);
  if (players === null) {
    return (
      <main className="shell home-page page draft-page">
        <section className="card draft-unavailable">
          <h1>Draft XI is unavailable</h1>
          <p>
            The current Premier League player catalog could not be loaded. Please try again later.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="shell home-page page draft-page">
      <DraftSimulator draftSeed={randomUUID()} players={players} />
    </main>
  );
}
