'use client';

import { useMemo, useState } from 'react';
import { MatchHeadToHead } from '@/components/match-head-to-head';
import { MatchHero } from '@/components/match-hero';
import { MatchPrediction } from '@/components/match-prediction';
import { MatchTabs } from '@/components/match-tabs';
import { Table, TableLegend } from '@/components/table';
import type { Fixture, Prediction, Season, Standing, Team } from '@/lib/api';
import { headToHeadMeetings, type H2hScope, type MatchTab } from '@/lib/match';
import { formTable, headToHeadCoverageLabel, nextFixtures } from '@/lib/season';
import { buildTeamDirectory, teamVisual } from '@/lib/teams';

export function MatchPageView({
  match,
  teams,
  seasons,
  seasonFixtures,
  standings,
  homeFixtures,
  prediction,
  tab: initialTab,
  h2hScope,
  hasPreview,
  isCurrentSeason,
}: {
  match: Fixture;
  teams: Team[];
  seasons: Season[];
  seasonFixtures: Fixture[];
  standings: Standing[];
  homeFixtures: Fixture[];
  prediction: Prediction | null;
  tab: MatchTab;
  h2hScope: H2hScope;
  hasPreview: boolean;
  isCurrentSeason: boolean;
}) {
  const [tab, setTab] = useState(initialTab);
  const directory = useMemo(() => buildTeamDirectory(teams), [teams]);
  const home = teamVisual(directory, match.home_team_id, match.home_team_name);
  const away = teamVisual(directory, match.away_team_id, match.away_team_name);
  const season = seasons.find((item) => item.id === match.season_id);
  const allMeetings = headToHeadMeetings(
    homeFixtures,
    match.home_team_id,
    match.away_team_id,
    match.id,
  );
  const form = useMemo(() => formTable(seasonFixtures, 5), [seasonFixtures]);
  const nextByTeam = useMemo(
    () => (isCurrentSeason ? nextFixtures(seasonFixtures) : undefined),
    [isCurrentSeason, seasonFixtures],
  );

  return (
    <>
      <h1 className="sr-only">
        {home.label} vs {away.label}
      </h1>
      <MatchHero
        away={away}
        competitionName={season?.competition_name ?? 'Premier League'}
        home={home}
        isCurrentSeason={season?.is_current ?? true}
        match={match}
        seasonName={season?.name}
        teams={directory}
      >
        <MatchTabs fixtureId={match.id} hasPreview={hasPreview} onSelect={setTab} value={tab} />
      </MatchHero>
      {tab === 'table' ? (
        <section
          aria-labelledby="match-table-heading"
          className="match-panel match-panel--table table-page-overview"
        >
          <h2 className="sr-only" id="match-table-heading">
            League table
          </h2>
          {standings.length ? (
            <>
              <Table
                form={form}
                highlightTeamIds={new Set([match.home_team_id, match.away_team_id])}
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
      {tab === 'h2h' ? (
        <MatchHeadToHead
          allMeetings={allMeetings}
          away={away}
          awayTeamId={match.away_team_id}
          coverageLabel={headToHeadCoverageLabel(seasons)}
          fixtureId={match.id}
          home={home}
          homeTeamId={match.home_team_id}
          scope={h2hScope}
          teams={directory}
        />
      ) : null}
      {tab === 'preview' && hasPreview ? (
        <MatchPrediction
          away={away}
          awayTeamId={match.away_team_id}
          excludeFixtureId={match.id}
          fixtures={seasonFixtures}
          home={home}
          homeTeamId={match.home_team_id}
          prediction={prediction}
          teams={directory}
        />
      ) : null}
    </>
  );
}
