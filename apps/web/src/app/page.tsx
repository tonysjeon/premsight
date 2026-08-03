import Link from 'next/link';
import { api, type Fixture, type Standing } from '@/lib/api';
import { MatchList } from '@/components/match-list';
import { Table } from '@/components/table';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const season = await api.currentSeason();
  const [fixtures, standings] = await Promise.all([
    api.fixtures(`season_id=${season.id}`),
    api.standings(season.id),
  ]);
  const upcoming = fixtures.filter((item: Fixture) => item.status === 'scheduled').slice(0, 5);
  const recent = fixtures
    .filter((item: Fixture) => item.status === 'completed')
    .slice(-5)
    .reverse();
  return (
    <main>
      <section className="hero wrap">
        <p className="eyebrow">Premier League · {season.name}</p>
        <h1>
          Every match.
          <br />
          One clear view.
        </h1>
        <p className="lede">Fixtures, results and the table—built for the rhythm of the weekend.</p>
        <Link className="button" href="/fixtures">
          Explore fixtures
        </Link>
      </section>
      <section className="paper">
        <div className="wrap grid">
          <div>
            <div className="section-head">
              <h2>Up next</h2>
              <Link href="/fixtures">All fixtures</Link>
            </div>
            <MatchList items={upcoming} empty="No upcoming fixtures yet." />
          </div>
          <div>
            <div className="section-head">
              <h2>Recent results</h2>
            </div>
            <MatchList items={recent} empty="No results yet." />
          </div>
        </div>
      </section>
      <section className="wrap table-section">
        <div className="section-head">
          <h2>League table</h2>
          <Link href="/table">Full table</Link>
        </div>
        <Table items={standings.slice(0, 6) as Standing[]} />
      </section>
    </main>
  );
}
