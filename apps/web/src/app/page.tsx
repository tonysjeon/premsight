import Link from 'next/link';
import { Card } from '@/components/card';
import { MatchList } from '@/components/match-list';
import { SeasonSelect } from '@/components/season-select';
import { StatTile } from '@/components/stat-tile';
import { Table, TableLegend } from '@/components/table';
import { api, type Fixture } from '@/lib/api';
import {
  fixturesInMatchday,
  formTable,
  matchdayDateWindow,
  matchdayWindow,
  matchdays,
  resolveMatchday,
  seasonSummary,
} from '@/lib/season';
import { buildTeamDirectory, teamVisual, type TeamDirectory } from '@/lib/teams';

export const dynamic = 'force-dynamic';

const RAIL_ROWS = 8;
const UPCOMING_ROWS = 5;
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
  const summary = seasonSummary(fixtures);
  const form = formTable(fixtures);
  const allMatchdays = matchdays(fixtures);
  const selectedMatchday = resolveMatchday(fixtures, requestedMatchday);
  const selectedFixtures =
    selectedMatchday === null ? [] : fixturesInMatchday(fixtures, selectedMatchday);
  const upcoming = fixtures
    .filter((fixture: Fixture) => fixture.status === 'scheduled')
    .slice(0, UPCOMING_ROWS);
  return (
    <main className="shell">
      <div className="home-toolbar">
        <SeasonSelect seasons={seasons} value={season.id} />
      </div>
      <div className="home-grid">
        <div>
          {upcoming.length ? (
            <Card action={{ href: '/fixtures', label: 'All fixtures' }} flush title="Up next">
              <MatchList empty="No upcoming fixtures." items={upcoming} teams={directory} />
            </Card>
          ) : null}

          <Card
            action={{ href: '/fixtures', label: 'All fixtures' }}
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
                    href={`/?season=${season.id}&matchday=${matchday}`}
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
        </div>

        <aside className="home-rail">
          <Card action={{ href: '/table', label: 'Full table' }} flush title="League table">
            {standings.length ? (
              <>
                <Table
                  compact
                  form={form}
                  items={standings.slice(0, RAIL_ROWS)}
                  leagueSize={standings.length}
                  teams={directory}
                />
                <TableLegend showRelegation={false} />
              </>
            ) : (
              <p className="empty">The table appears once matches are played.</p>
            )}
          </Card>

          <Card title="Season numbers">
            <div className="stats">
              <StatTile label="Matches" value={String(summary.played)} />
              <StatTile label="Goals" value={String(summary.goals)} />
              <StatTile label="Goals / game" value={summary.goalsPerGame} />
              <StatTile label="Home wins" value={summary.homeWinShare} />
            </div>
            {summary.biggestWin ? (
              <BiggestWin fixture={summary.biggestWin} teams={directory} />
            ) : null}
          </Card>
        </aside>
      </div>
    </main>
  );
}

function BiggestWin({ fixture, teams }: { fixture: Fixture; teams: TeamDirectory }) {
  const home = teamVisual(teams, fixture.home_team_id, fixture.home_team_name);
  const away = teamVisual(teams, fixture.away_team_id, fixture.away_team_name);
  return (
    <p className="card-foot">
      Biggest win:{' '}
      <Link href={`/matches/${fixture.id}`}>
        <strong>
          {home.label} {fixture.home_score}–{fixture.away_score} {away.label}
        </strong>
      </Link>
    </p>
  );
}
