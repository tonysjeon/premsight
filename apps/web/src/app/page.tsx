import { Card } from '@/components/card';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { SeasonSelect } from '@/components/season-select';
import { Table, TableLegend } from '@/components/table';
import { api } from '@/lib/api';
import { fixturesInMatchday, matchdayDateWindow, resolveMatchday } from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ matchday?: string | string[]; season?: string | string[] }>;
}) {
  const { matchday: requestedMatchday, season: requestedSeason } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([api.currentSeason(), api.seasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? currentSeason;
  const [fixtures, standings, teams] = await Promise.all([
    api.fixtures(`season_id=${season.id}`),
    api.standings(season.id),
    api.teams(`season_id=${season.id}`),
  ]);

  const directory = buildTeamDirectory(teams);
  const selectedMatchday = resolveMatchday(fixtures, requestedMatchday);
  const selectedFixtures =
    selectedMatchday === null ? [] : fixturesInMatchday(fixtures, selectedMatchday);
  return (
    <main className="shell">
      <div className="home-toolbar">
        <SeasonSelect seasons={seasons} value={season.id} />
      </div>
      <div className="home-grid">
        <Card action={{ href: '/table', label: 'Full table' }} flush title="League table">
          <Table items={standings} leagueSize={standings.length} overview teams={directory} />
          <TableLegend />
        </Card>

        <aside className="home-rail">
          <Card
            action={{ href: `/fixtures?season=${season.id}`, label: 'All fixtures' }}
            flush
            note={matchdayDateWindow(selectedFixtures)}
            title={selectedMatchday === null ? 'Matches' : `Matchday ${selectedMatchday}`}
          >
            <MatchdaySnapshot items={selectedFixtures} teams={directory} />
          </Card>
        </aside>
      </div>
    </main>
  );
}
