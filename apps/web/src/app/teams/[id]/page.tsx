import type { Metadata } from 'next';
import { TeamPageView } from '@/components/team-page-view';
import {
  loadCurrentSeason,
  loadFixtures,
  loadRoster,
  loadStandings,
  loadTeam,
  loadTeams,
} from '@/lib/football-load';
import { teamPublicId } from '@/lib/public-id';
import { TEAM_FIXTURE_PAGE_SIZE, groupByTwoMonthPeriod, resolvePeriodIndex } from '@/lib/season';
import { resolveTeamTab } from '@/lib/team-page';
import { buildTeamDirectory, tableTeamLabel, teamVisual } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const team = await loadTeam((await params).id);
  return { title: tableTeamLabel(teamVisual(buildTeamDirectory([team]), team.id, team.name)) };
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
  const [team, teams, currentSeason] = await Promise.all([
    loadTeam(id),
    loadTeams(),
    loadCurrentSeason(),
  ]);
  const [standings, seasonFixtures, roster] = await Promise.all([
    loadStandings(currentSeason.id),
    loadFixtures(`season_id=${currentSeason.id}`),
    loadRoster(team.id, currentSeason.id),
  ]);
  const teamFixtures = (team.fixtures ?? []).filter(
    (fixture) => fixture.season_id === currentSeason.id,
  );
  const fixturePages = groupByTwoMonthPeriod(teamFixtures, TEAM_FIXTURE_PAGE_SIZE);

  return (
    <main className="shell match-page team-page">
      <TeamPageView
        page={resolvePeriodIndex(fixturePages, requestedPage)}
        publicId={teamPublicId(team)}
        roster={roster}
        season={currentSeason}
        seasonFixtures={seasonFixtures}
        standings={standings}
        tab={resolveTeamTab(requestedTab)}
        team={team}
        teams={teams}
      />
    </main>
  );
}
