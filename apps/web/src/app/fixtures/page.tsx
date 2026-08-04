import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/card';
import { MatchList } from '@/components/match-list';
import { api, type Fixture } from '@/lib/api';
import {
  fixturesInMatchday,
  matchdayDateWindow,
  matchdayWindow,
  matchdays,
  resolveMatchday,
} from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

export const metadata: Metadata = { title: 'Fixtures' };
export const dynamic = 'force-dynamic';

const UPCOMING_ROWS = 5;

export default async function Fixtures({
  searchParams,
}: {
  searchParams: Promise<{ matchday?: string | string[]; season?: string | string[] }>;
}) {
  const { matchday: requestedMatchday, season: requestedSeason } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([api.currentSeason(), api.seasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? currentSeason;
  const [fixtures, teams] = await Promise.all([
    api.fixtures(`season_id=${season.id}`),
    api.teams(`season_id=${season.id}`),
  ]);
  const directory = buildTeamDirectory(teams);
  const allMatchdays = matchdays(fixtures);
  const selectedMatchday = resolveMatchday(fixtures, requestedMatchday);
  const selectedFixtures =
    selectedMatchday === null ? [] : fixturesInMatchday(fixtures, selectedMatchday);
  const upcoming = fixtures
    .filter((fixture: Fixture) => fixture.status === 'scheduled')
    .slice(0, UPCOMING_ROWS);

  return (
    <main className="shell page">
      <div>
        <p className="eyebrow">{season.name}</p>
        <h1>Fixtures &amp; results</h1>
        <p className="page-lede">Browse the next matches or jump to any matchday.</p>
      </div>
      {upcoming.length ? (
        <Card flush title="Up next">
          <MatchList empty="No upcoming fixtures." items={upcoming} teams={directory} />
        </Card>
      ) : null}
      <Card
        flush
        note={matchdayDateWindow(selectedFixtures)}
        title={selectedMatchday === null ? 'Matches' : `Matchday ${selectedMatchday}`}
      >
        {allMatchdays.length > 1 ? (
          <nav aria-label="Select matchday" className="chips">
            {matchdayWindow(allMatchdays, selectedMatchday).map((matchday) => (
              <Link
                aria-current={matchday === selectedMatchday}
                className="chip"
                href={`/fixtures?season=${season.id}&matchday=${matchday}`}
                key={matchday}
              >
                MD {matchday}
              </Link>
            ))}
          </nav>
        ) : null}
        <MatchList
          columns
          empty="No matches have been imported for this season."
          items={selectedFixtures}
          teams={directory}
        />
      </Card>
    </main>
  );
}
