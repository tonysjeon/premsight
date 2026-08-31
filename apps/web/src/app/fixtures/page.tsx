import type { Metadata } from 'next';
import { FixturesPageView } from '@/components/fixtures-page-view';
import { loadCurrentSeason, loadFixtures, loadSeasons, loadTeams } from '@/lib/football-load';
import { resolveSeason, teamPublicId } from '@/lib/public-id';
import { resolveMatchday, resolvePeriodIndex, groupByTwoMonthPeriod } from '@/lib/season';
import { buildTeamDirectory, matchdayTeamLabel, teamVisual } from '@/lib/teams';

export const metadata: Metadata = { title: 'Fixtures' };
export const dynamic = 'force-dynamic';

export default async function Fixtures({
  searchParams,
}: {
  searchParams: Promise<{
    matchday?: string | string[];
    period?: string | string[];
    season?: string | string[];
    team?: string | string[];
    view?: string | string[];
  }>;
}) {
  const {
    matchday: requestedMatchday,
    period: requestedPeriod,
    season: requestedSeason,
    team: requestedTeam,
    view: requestedView,
  } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([loadCurrentSeason(), loadSeasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = resolveSeason(seasons, requestedSeasonId, currentSeason);
  const [fixtures, teams] = await Promise.all([
    loadFixtures(`season_id=${season.id}`),
    loadTeams(`season_id=${season.id}`),
  ]);
  const rawView = Array.isArray(requestedView) ? requestedView[0] : requestedView;
  const view = rawView === 'team' ? 'team' : 'matchday';
  const rawTeam = Array.isArray(requestedTeam) ? requestedTeam[0] : requestedTeam;
  const directory = buildTeamDirectory(teams);
  const teamOptions = teams
    .map((team) => ({
      team,
      slug: teamPublicId(team),
      label: matchdayTeamLabel(teamVisual(directory, team.id, team.name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const selectedTeam =
    teamOptions.find(
      (option) =>
        rawTeam !== undefined &&
        (option.team.id === rawTeam || option.slug.toLowerCase() === rawTeam.toLowerCase()),
    ) ??
    teamOptions[0] ??
    null;
  const teamFixtures =
    selectedTeam === null
      ? []
      : fixtures.filter(
          (fixture) =>
            fixture.home_team_id === selectedTeam.team.id ||
            fixture.away_team_id === selectedTeam.team.id,
        );

  return (
    <main className="shell home-page page fixtures-page">
      <FixturesPageView
        fixtures={fixtures}
        matchday={resolveMatchday(fixtures, requestedMatchday)}
        period={resolvePeriodIndex(groupByTwoMonthPeriod(teamFixtures), requestedPeriod)}
        season={season}
        teamSlug={selectedTeam?.slug ?? null}
        teams={teams}
        view={view}
      />
    </main>
  );
}
