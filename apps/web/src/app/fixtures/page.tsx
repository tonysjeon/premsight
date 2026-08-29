import type { Metadata } from 'next';
import Link from 'next/link';
import { Card } from '@/components/card';
import { MatchdayNavigation } from '@/components/matchday-navigation';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { SelectionNavigation } from '@/components/selection-navigation';
import { api } from '@/lib/api';
import { resolveSeason, seasonPublicId, teamPublicId, withSeasonQuery } from '@/lib/public-id';
import {
  fixturesInMatchday,
  groupByTwoMonthPeriod,
  matchdays,
  resolveMatchday,
} from '@/lib/season';
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
  const [currentSeason, seasons] = await Promise.all([api.currentSeason(), api.seasons()]);
  const requestedSeasonId = Array.isArray(requestedSeason) ? requestedSeason[0] : requestedSeason;
  const season = resolveSeason(seasons, requestedSeasonId, currentSeason);
  const [fixtures, teams] = await Promise.all([
    api.fixtures(`season_id=${season.id}`),
    api.teams(`season_id=${season.id}`),
  ]);
  const directory = buildTeamDirectory(teams);
  const teamOptions = teams
    .map((team) => {
      const visual = teamVisual(directory, team.id, team.name);
      return {
        id: team.id,
        slug: teamPublicId(team),
        label: matchdayTeamLabel(visual),
        visual,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const rawView = Array.isArray(requestedView) ? requestedView[0] : requestedView;
  const view = rawView === 'team' ? 'team' : 'matchday';
  const rawTeam = Array.isArray(requestedTeam) ? requestedTeam[0] : requestedTeam;
  const selectedTeam =
    teamOptions.find(
      (team) =>
        rawTeam !== undefined &&
        (team.id === rawTeam || team.slug.toLowerCase() === rawTeam.toLowerCase()),
    ) ??
    teamOptions[0] ??
    null;
  const allMatchdays = matchdays(fixtures);
  const selectedMatchday = resolveMatchday(fixtures, requestedMatchday);
  const teamFixtures =
    selectedTeam === null
      ? []
      : fixtures.filter(
          (fixture) =>
            fixture.home_team_id === selectedTeam.id || fixture.away_team_id === selectedTeam.id,
        );
  const fixturePeriods = groupByTwoMonthPeriod(teamFixtures);
  const rawPeriod = Array.isArray(requestedPeriod) ? requestedPeriod[0] : requestedPeriod;
  const parsedPeriod =
    rawPeriod !== undefined && /^\d{1,2}$/.test(rawPeriod) ? Number(rawPeriod) : 0;
  const periodIndex = parsedPeriod >= 0 && parsedPeriod < fixturePeriods.length ? parsedPeriod : 0;
  const selectedPeriod = fixturePeriods[periodIndex] ?? null;
  const selectedFixtures =
    view === 'team'
      ? (selectedPeriod?.fixtures ?? [])
      : selectedMatchday === null
        ? []
        : fixturesInMatchday(fixtures, selectedMatchday);
  const matchdayHref = withSeasonQuery(
    '/fixtures',
    season,
    selectedMatchday === null ? {} : { matchday: selectedMatchday },
  );
  const teamHref = withSeasonQuery('/fixtures', season, {
    view: 'team',
    team: selectedTeam?.slug,
  });

  return (
    <main className="shell home-page page fixtures-page">
      <Card flush>
        <nav aria-label="Group fixtures" className="chips view-filters">
          <Link
            aria-current={view === 'matchday' ? 'true' : undefined}
            className="chip"
            href={matchdayHref}
          >
            By Round
          </Link>
          <Link
            aria-current={view === 'team' ? 'true' : undefined}
            className="chip"
            href={teamHref}
          >
            By Team
          </Link>
        </nav>
        {view === 'team' ? (
          <SelectionNavigation
            ariaLabel="Select team"
            emptyLabel="Teams"
            itemLabel="team"
            options={teamOptions.map((team) => ({
              value: team.slug,
              label: team.label,
              badge: team.visual,
              href: withSeasonQuery('/fixtures', season, { view: 'team', team: team.slug }),
            }))}
            showArrows={false}
            value={selectedTeam?.slug ?? null}
          />
        ) : (
          <MatchdayNavigation
            basePath="/fixtures"
            isCurrentSeason={season.is_current}
            matchdays={allMatchdays}
            seasonId={seasonPublicId(season)}
            seasonName={season.name}
            value={selectedMatchday}
          />
        )}
        <MatchdaySnapshot
          includeYear={!season.is_current}
          items={selectedFixtures}
          periodLabel={view === 'team' ? selectedPeriod?.label : undefined}
          teams={directory}
        />
        {view === 'team' && selectedTeam ? (
          <nav aria-label="Select fixture period" className="fixture-period-navigation">
            {periodIndex > 0 ? (
              <Link
                aria-label="Previous fixture period"
                href={withSeasonQuery('/fixtures', season, {
                  view: 'team',
                  team: selectedTeam.slug,
                  period: periodIndex - 1,
                })}
              >
                ‹
              </Link>
            ) : (
              <span aria-hidden="true">‹</span>
            )}
            {periodIndex < fixturePeriods.length - 1 ? (
              <Link
                aria-label="Next fixture period"
                href={withSeasonQuery('/fixtures', season, {
                  view: 'team',
                  team: selectedTeam.slug,
                  period: periodIndex + 1,
                })}
              >
                ›
              </Link>
            ) : (
              <span aria-hidden="true">›</span>
            )}
          </nav>
        ) : null}
      </Card>
    </main>
  );
}
