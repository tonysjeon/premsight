import type { Metadata } from 'next';
import { TablePageView } from '@/components/table-page-view';
import { loadCurrentSeason, loadFixtures, loadSeasons, loadStandings, loadTeams } from '@/lib/football-load';
import { resolveSeason } from '@/lib/public-id';
import type { VenueFilter } from '@/lib/season';

export const metadata: Metadata = { title: 'League table' };
export const dynamic = 'force-dynamic';

export default async function TablePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string | string[]; venue?: string | string[] }>;
}) {
  const { season: requestedSeason, venue: requestedVenue } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([loadCurrentSeason(), loadSeasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = resolveSeason(seasons, requestedSeasonId, currentSeason);
  const rawVenue = Array.isArray(requestedVenue) ? requestedVenue[0] : requestedVenue;
  const venue: VenueFilter = rawVenue === 'home' || rawVenue === 'away' ? rawVenue : 'all';
  const [items, fixtures, teams] = await Promise.all([
    loadStandings(season.id),
    loadFixtures(`season_id=${season.id}`),
    loadTeams(`season_id=${season.id}`),
  ]);
  return (
    <main className="shell home-page page table-page">
      <TablePageView fixtures={fixtures} items={items} season={season} teams={teams} venue={venue} />
    </main>
  );
}
