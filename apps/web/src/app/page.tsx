import { Card } from '@/components/card';
import { MatchdayNavigation } from '@/components/matchday-navigation';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { Table, TableLegend } from '@/components/table';
import { api } from '@/lib/api';
import { resolveSeason, seasonPublicId } from '@/lib/public-id';
import {
  OVERVIEW_MOBILE_ROWS,
  fixturesInMatchday,
  formTable,
  matchdays,
  nextFixtures,
  resolveMatchday,
} from '@/lib/season';
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
  const season = resolveSeason(seasons, requestedSeasonId, currentSeason);
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
    <main className="shell home-page">
      <div className="home-grid">
        <Card flush>
          <Table
            form={formTable(fixtures, 5)}
            items={standings}
            leagueSize={standings.length}
            mobileLimit={OVERVIEW_MOBILE_ROWS}
            nextByTeam={season.is_current ? nextFixtures(fixtures) : undefined}
            overview
            teams={directory}
          />
          <TableLegend />
        </Card>

        <aside className="home-rail">
          <Card flush>
            <MatchdayNavigation
              matchdays={matchdays(fixtures)}
              seasonId={seasonPublicId(season)}
              value={selectedMatchday}
            />
            <MatchdaySnapshot items={selectedFixtures} teams={directory} />
          </Card>
        </aside>
      </div>
    </main>
  );
}
