'use client';

import { useMemo, useState } from 'react';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { SelectionNavigation } from '@/components/selection-navigation';
import { Table, TableLegend } from '@/components/table';
import { TeamHero } from '@/components/team-hero';
import { TeamRoster } from '@/components/team-roster';
import { TeamTabs } from '@/components/team-tabs';
import type { Fixture, Player, Season, Standing, Team } from '@/lib/api';
import { replacePath } from '@/lib/client-nav';
import {
  TEAM_FIXTURE_PAGE_SIZE,
  formTable,
  groupByTwoMonthPeriod,
  nextFixtures,
} from '@/lib/season';
import type { TeamTab } from '@/lib/team-page';
import { buildTeamDirectory, tableTeamLabel, teamVisual } from '@/lib/teams';

export function TeamPageView({
  team,
  teams,
  season,
  publicId,
  tab: initialTab,
  page: initialPage,
  standings,
  seasonFixtures,
  roster,
}: {
  team: Team;
  teams: Team[];
  season: Season;
  publicId: string;
  tab: TeamTab;
  page: number;
  standings: Standing[];
  seasonFixtures: Fixture[];
  roster: Player[];
}) {
  const [tab, setTab] = useState(initialTab);
  const [pageIndex, setPageIndex] = useState(initialPage);
  const directory = useMemo(() => buildTeamDirectory(teams), [teams]);
  const visual = teamVisual(directory, team.id, team.name);
  const teamFixtures = (team.fixtures ?? []).filter((fixture) => fixture.season_id === season.id);
  const fixturePages = groupByTwoMonthPeriod(teamFixtures, TEAM_FIXTURE_PAGE_SIZE);
  const safePage = fixturePages.length
    ? Math.min(Math.max(pageIndex, 0), fixturePages.length - 1)
    : 0;
  const selectedPage = fixturePages[safePage] ?? null;
  const form = useMemo(() => formTable(seasonFixtures, 5), [seasonFixtures]);
  const nextByTeam = useMemo(
    () => (season.is_current ? nextFixtures(seasonFixtures) : undefined),
    [season.is_current, seasonFixtures],
  );

  return (
    <>
      <TeamHero
        competitionName={season.competition_name}
        name={tableTeamLabel(visual)}
        visual={visual}
      >
        <TeamTabs onSelect={setTab} teamId={publicId} value={tab} />
      </TeamHero>
      {tab === 'fixtures' ? (
        <section aria-labelledby="team-fixtures-heading" className="match-panel team-fixtures">
          <SelectionNavigation
            ariaLabel="Fixture pages"
            emptyLabel="Fixtures"
            heading="Fixtures"
            headingId="team-fixtures-heading"
            itemLabel="page"
            onSelect={(option) => {
              setPageIndex(Number(option.value));
              replacePath(option.href);
            }}
            options={fixturePages.map((period, index) => ({
              value: String(index),
              label: period.label,
              href: `/teams/${publicId}?page=${index}`,
            }))}
            showPicker={false}
            value={fixturePages.length ? String(safePage) : null}
          />
          <MatchdaySnapshot
            empty="No fixtures found for this team."
            items={selectedPage?.fixtures ?? []}
            teams={directory}
          />
        </section>
      ) : null}
      {tab === 'table' ? (
        <section
          aria-labelledby="team-table-heading"
          className="match-panel match-panel--table table-page-overview"
        >
          <h2 className="sr-only" id="team-table-heading">
            League table
          </h2>
          {standings.length ? (
            <>
              <Table
                form={form}
                highlightTeamIds={new Set([team.id])}
                items={standings}
                leagueSize={standings.length}
                nextByTeam={nextByTeam}
                overview
                teams={directory}
              />
              <TableLegend />
            </>
          ) : (
            <p className="empty">The table appears once this season has teams.</p>
          )}
        </section>
      ) : null}
      {tab === 'roster' ? (
        <section aria-labelledby="team-roster-heading" className="match-panel team-roster-panel">
          <h2 className="sr-only" id="team-roster-heading">
            Roster
          </h2>
          <TeamRoster players={roster} />
        </section>
      ) : null}
    </>
  );
}
