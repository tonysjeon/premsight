'use client';

import { useMemo, useState } from 'react';
import { Card } from '@/components/card';
import { MatchdayNavigation } from '@/components/matchday-navigation';
import { MatchdaySnapshot } from '@/components/matchday-snapshot';
import { SelectionNavigation } from '@/components/selection-navigation';
import type { Fixture, Season, Team } from '@/lib/api';
import { replacePath, shouldSoftNavigate } from '@/lib/client-nav';
import { seasonPublicId, teamPublicId, withSeasonQuery } from '@/lib/public-id';
import {
  fixturesInMatchday,
  groupByTwoMonthPeriod,
  matchdays,
} from '@/lib/season';
import { buildTeamDirectory, matchdayTeamLabel, teamVisual } from '@/lib/teams';

export function FixturesPageView({
  season,
  fixtures,
  teams,
  view: initialView,
  teamSlug: initialTeamSlug,
  matchday: initialMatchday,
  period: initialPeriod,
}: {
  season: Season;
  fixtures: Fixture[];
  teams: Team[];
  view: 'matchday' | 'team';
  teamSlug: string | null;
  matchday: number | null;
  period: number;
}) {
  const [view, setView] = useState(initialView);
  const [teamSlug, setTeamSlug] = useState(initialTeamSlug);
  const [selectedMatchday, setSelectedMatchday] = useState(initialMatchday);
  const [periodIndex, setPeriodIndex] = useState(initialPeriod);

  const directory = useMemo(() => buildTeamDirectory(teams), [teams]);
  const teamOptions = useMemo(
    () =>
      teams
        .map((team) => {
          const visual = teamVisual(directory, team.id, team.name);
          return {
            id: team.id,
            slug: teamPublicId(team),
            label: matchdayTeamLabel(visual),
            visual,
          };
        })
        .sort((a, b) => a.label.localeCompare(b.label)),
    [directory, teams],
  );
  const selectedTeam =
    teamOptions.find((team) => team.slug === teamSlug) ?? teamOptions[0] ?? null;
  const allMatchdays = matchdays(fixtures);
  const teamFixtures =
    selectedTeam === null
      ? []
      : fixtures.filter(
          (fixture) =>
            fixture.home_team_id === selectedTeam.id || fixture.away_team_id === selectedTeam.id,
        );
  const fixturePeriods = groupByTwoMonthPeriod(teamFixtures);
  const safePeriod =
    periodIndex >= 0 && periodIndex < fixturePeriods.length ? periodIndex : 0;
  const selectedPeriod = fixturePeriods[safePeriod] ?? null;
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
    <Card flush>
      <nav aria-label="Group fixtures" className="chips view-filters">
        <a
          aria-current={view === 'matchday' ? 'true' : undefined}
          className="chip"
          href={matchdayHref}
          onClick={(event) => {
            if (!shouldSoftNavigate(event)) return;
            event.preventDefault();
            setView('matchday');
            replacePath(matchdayHref);
          }}
        >
          By Round
        </a>
        <a
          aria-current={view === 'team' ? 'true' : undefined}
          className="chip"
          href={teamHref}
          onClick={(event) => {
            if (!shouldSoftNavigate(event)) return;
            event.preventDefault();
            setView('team');
            replacePath(teamHref);
          }}
        >
          By Team
        </a>
      </nav>
      {view === 'team' ? (
        <SelectionNavigation
          ariaLabel="Select team"
          emptyLabel="Teams"
          itemLabel="team"
          onSelect={(option) => {
            setTeamSlug(option.value);
            setPeriodIndex(0);
            replacePath(option.href);
          }}
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
          onSelect={(next, href) => {
            setSelectedMatchday(next);
            replacePath(href);
          }}
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
          {safePeriod > 0 ? (
            <a
              aria-label="Previous fixture period"
              href={withSeasonQuery('/fixtures', season, {
                view: 'team',
                team: selectedTeam.slug,
                period: safePeriod - 1,
              })}
              onClick={(event) => {
                if (!shouldSoftNavigate(event)) return;
                event.preventDefault();
                const next = safePeriod - 1;
                setPeriodIndex(next);
                replacePath(
                  withSeasonQuery('/fixtures', season, {
                    view: 'team',
                    team: selectedTeam.slug,
                    period: next,
                  }),
                );
              }}
            >
              ‹
            </a>
          ) : (
            <span aria-hidden="true">‹</span>
          )}
          {safePeriod < fixturePeriods.length - 1 ? (
            <a
              aria-label="Next fixture period"
              href={withSeasonQuery('/fixtures', season, {
                view: 'team',
                team: selectedTeam.slug,
                period: safePeriod + 1,
              })}
              onClick={(event) => {
                if (!shouldSoftNavigate(event)) return;
                event.preventDefault();
                const next = safePeriod + 1;
                setPeriodIndex(next);
                replacePath(
                  withSeasonQuery('/fixtures', season, {
                    view: 'team',
                    team: selectedTeam.slug,
                    period: next,
                  }),
                );
              }}
            >
              ›
            </a>
          ) : (
            <span aria-hidden="true">›</span>
          )}
        </nav>
      ) : null}
    </Card>
  );
}
