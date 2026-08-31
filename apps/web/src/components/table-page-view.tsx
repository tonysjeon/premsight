'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/card';
import { Table, TableLegend } from '@/components/table';
import type { Fixture, Season, Standing, Team } from '@/lib/api';
import { replacePath, shouldSoftNavigate } from '@/lib/client-nav';
import { withSeasonQuery } from '@/lib/public-id';
import { formTable, nextFixtures, standingsByVenue, type VenueFilter } from '@/lib/season';
import { buildTeamDirectory } from '@/lib/teams';

const VENUE_FILTERS: readonly { label: string; value: VenueFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Home', value: 'home' },
  { label: 'Away', value: 'away' },
];

export function TablePageView({
  season,
  items,
  fixtures,
  teams,
  venue: initialVenue,
}: {
  season: Season;
  items: Standing[];
  fixtures: Fixture[];
  teams: Team[];
  venue: VenueFilter;
}) {
  const [venue, setVenue] = useState(initialVenue);
  const directory = useMemo(() => buildTeamDirectory(teams), [teams]);
  const form = useMemo(() => formTable(fixtures, 5), [fixtures]);
  const nextByTeam = useMemo(
    () => (season.is_current ? nextFixtures(fixtures) : undefined),
    [fixtures, season.is_current],
  );
  const displayedItems =
    venue === 'all' ? items : standingsByVenue(items, fixtures, venue);

  return (
    <div className="table-page-overview">
      <Card flush>
        <nav aria-label="Filter table by venue" className="chips view-filters">
          {VENUE_FILTERS.map((filter) => {
            const href = withSeasonQuery(
              '/table',
              season,
              filter.value === 'all' ? {} : { venue: filter.value },
            );
            return (
              <a
                aria-current={filter.value === venue ? 'true' : undefined}
                className="chip"
                href={href}
                key={filter.value}
                onClick={(event) => {
                  if (!shouldSoftNavigate(event)) return;
                  event.preventDefault();
                  setVenue(filter.value);
                  replacePath(href);
                }}
              >
                {filter.label}
              </a>
            );
          })}
        </nav>
        {displayedItems.length ? (
          <>
            <Table
              form={form}
              items={displayedItems}
              leagueSize={displayedItems.length}
              nextByTeam={nextByTeam}
              overview
              teams={directory}
            />
            <TableLegend />
          </>
        ) : (
          <p className="empty">The table appears once matches are played.</p>
        )}
      </Card>
    </div>
  );
}
