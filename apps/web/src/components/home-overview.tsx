'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/card';
import { MatchdayNavigation } from '@/components/matchday-navigation';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { Table, TableLegend } from '@/components/table';
import type { Fixture, Season, Standing, Team } from '@/lib/api';
import { replacePath } from '@/lib/client-nav';
import { seasonPublicId } from '@/lib/public-id';
import {
  OVERVIEW_MOBILE_ROWS,
  fixturesInMatchday,
  formTable,
  matchdays,
  nextFixtures,
} from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

export function HomeOverview({
  season,
  fixtures,
  standings,
  teams,
  matchday,
}: {
  season: Season;
  fixtures: Fixture[];
  standings: Standing[];
  teams: Team[];
  matchday: number | null;
}) {
  const [selectedMatchday, setSelectedMatchday] = useState(matchday);
  const directory = useMemo(() => buildTeamDirectory(teams), [teams]);
  const form = useMemo(() => formTable(fixtures, 5), [fixtures]);
  const nextByTeam = useMemo(
    () => (season.is_current ? nextFixtures(fixtures) : undefined),
    [fixtures, season.is_current],
  );
  const selectedFixtures =
    selectedMatchday === null ? [] : fixturesInMatchday(fixtures, selectedMatchday);

  return (
    <div className="home-grid">
      <Card flush>
        <Table
          form={form}
          items={standings}
          leagueSize={standings.length}
          mobileLimit={OVERVIEW_MOBILE_ROWS}
          nextByTeam={nextByTeam}
          overview
          teams={directory}
        />
        <TableLegend />
      </Card>

      <aside className="home-rail">
        <Card flush>
          <MatchdayNavigation
            matchdays={matchdays(fixtures)}
            onSelect={(next, href) => {
              setSelectedMatchday(next);
              replacePath(href);
            }}
            seasonId={seasonPublicId(season)}
            value={selectedMatchday}
          />
          <MatchdaySnapshot items={selectedFixtures} teams={directory} />
        </Card>
      </aside>
    </div>
  );
}
