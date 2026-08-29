import type { Metadata } from 'next';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { SelectionNavigation } from '@/components/selection-navigation';
import { Table, TableLegend } from '@/components/table';
import { TeamHero } from '@/components/team-hero';
import { TeamTabs } from '@/components/team-tabs';
import { api } from '@/lib/api';
import { teamPublicId } from '@/lib/public-id';
import {
  TEAM_FIXTURE_PAGE_SIZE,
  formTable,
  groupByTwoMonthPeriod,
  nextFixtures,
  resolvePeriodIndex,
} from '@/lib/season';
import { resolveTeamTab } from '@/lib/team-page';
import { buildTeamDirectory, shortenName, teamVisual } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await api.team((await params).id)).name };
}

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; page?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab: requestedTab, page: requestedPage } = await searchParams;
  const tab = resolveTeamTab(requestedTab);
  const [team, teams, currentSeason] = await Promise.all([
    api.team(id),
    api.teams(),
    api.currentSeason(),
  ]);
  const [standings, seasonFixtures] = await Promise.all([
    tab === 'table' ? api.standings(currentSeason.id) : Promise.resolve(null),
    tab === 'table' ? api.fixtures(`season_id=${currentSeason.id}`) : Promise.resolve(null),
  ]);

  const directory = buildTeamDirectory(teams);
  const visual = teamVisual(directory, team.id, team.name);
  const publicId = teamPublicId(team);
  const teamFixtures = (team.fixtures ?? []).filter(
    (fixture) => fixture.season_id === currentSeason.id,
  );
  const fixturePages = groupByTwoMonthPeriod(teamFixtures, TEAM_FIXTURE_PAGE_SIZE);
  const pageIndex = resolvePeriodIndex(fixturePages, requestedPage);
  const selectedPage = fixturePages[pageIndex] ?? null;

  return (
    <main className="shell match-page team-page">
      <TeamHero
        competitionName={currentSeason.competition_name}
        name={shortenName(team.name)}
        visual={visual}
      >
        <TeamTabs teamId={publicId} value={tab} />
      </TeamHero>
      {tab === 'fixtures' ? (
        <section aria-labelledby="team-fixtures-heading" className="match-panel team-fixtures">
          <SelectionNavigation
            ariaLabel="Fixture pages"
            emptyLabel="Fixtures"
            heading="Fixtures"
            headingId="team-fixtures-heading"
            itemLabel="page"
            options={fixturePages.map((period, index) => ({
              value: String(index),
              label: period.label,
              href: `/teams/${publicId}?page=${index}`,
            }))}
            showPicker={false}
            value={fixturePages.length ? String(pageIndex) : null}
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
          {standings?.length ? (
            <>
              <Table
                form={seasonFixtures ? formTable(seasonFixtures, 5) : undefined}
                highlightTeamIds={new Set([team.id])}
                items={standings}
                leagueSize={standings.length}
                nextByTeam={
                  currentSeason.is_current ? nextFixtures(seasonFixtures ?? []) : undefined
                }
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
        <section aria-labelledby="team-roster-heading" className="match-panel">
          <h2 className="sr-only" id="team-roster-heading">
            Roster
          </h2>
          <p className="empty">Squad details will appear here.</p>
        </section>
      ) : null}
    </main>
  );
}
