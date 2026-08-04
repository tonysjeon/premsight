import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/card';
import { Table, TableLegend } from '@/components/table';
import { api } from '@/lib/api';
import { nextFixtures, standingsByVenue, type VenueFilter } from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

export const metadata: Metadata = { title: 'League table' };
export const dynamic = 'force-dynamic';

export default async function TablePage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string | string[]; venue?: string | string[] }>;
}) {
  const { season: requestedSeason, venue: requestedVenue } = await searchParams;
  const [currentSeason, seasons] = await Promise.all([api.currentSeason(), api.seasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = seasons.find((item) => item.id === requestedSeasonId) ?? currentSeason;
  const rawVenue = Array.isArray(requestedVenue) ? requestedVenue[0] : requestedVenue;
  const venue: VenueFilter = rawVenue === 'home' || rawVenue === 'away' ? rawVenue : 'all';
  const [items, fixtures, teams] = await Promise.all([
    api.standings(season.id),
    api.fixtures(`season_id=${season.id}`),
    api.teams(`season_id=${season.id}`),
  ]);
  const displayedItems = venue === 'all' ? items : standingsByVenue(items, fixtures, venue);
  const venueFilters: readonly { label: string; value: VenueFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Home', value: 'home' },
    { label: 'Away', value: 'away' },
  ];
  return (
    <main className="shell home-page page table-page">
      <div className="table-page-overview">
        <Card flush>
          <nav aria-label="Filter table by venue" className="chips table-venue-filters">
            {venueFilters.map((filter) => (
              <Link
                aria-current={filter.value === venue ? 'true' : undefined}
                className="chip"
                href={`/table?season=${encodeURIComponent(season.id)}${filter.value === 'all' ? '' : `&venue=${filter.value}`}`}
                key={filter.value}
              >
                {filter.label}
              </Link>
            ))}
          </nav>
          {displayedItems.length ? (
            <>
              <Table
                items={displayedItems}
                leagueSize={displayedItems.length}
                nextByTeam={nextFixtures(fixtures)}
                overview
                teams={buildTeamDirectory(teams)}
              />
              <TableLegend />
            </>
          ) : (
            <p className="empty">The table appears once matches are played.</p>
          )}
        </Card>
      </div>
    </main>
  );
}
