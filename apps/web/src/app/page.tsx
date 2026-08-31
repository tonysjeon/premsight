import { HomeOverview } from '@/components/home-overview';
import { loadCurrentSeason, loadFixtures, loadSeasons, loadStandings, loadTeams } from '@/lib/football-load';
import { resolveSeason } from '@/lib/public-id';
import { resolveMatchday } from '@/lib/season';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ matchday?: string | string[]; season?: string | string[] }>;
}) {
  const { matchday: requestedMatchday, season: requestedSeason } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([loadCurrentSeason(), loadSeasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = resolveSeason(seasons, requestedSeasonId, currentSeason);
  const [fixtures, standings, teams] = await Promise.all([
    loadFixtures(`season_id=${season.id}`),
    loadStandings(season.id),
    loadTeams(`season_id=${season.id}`),
  ]);

  return (
    <main className="shell home-page">
      <HomeOverview
        fixtures={fixtures}
        matchday={resolveMatchday(fixtures, requestedMatchday)}
        season={season}
        standings={standings}
        teams={teams}
      />
    </main>
  );
}
