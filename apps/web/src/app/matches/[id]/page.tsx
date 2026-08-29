import type { Metadata } from 'next';
import { MatchHeadToHead } from '@/components/match-head-to-head';
import { MatchHero } from '@/components/match-hero';
import { MatchPrediction } from '@/components/match-prediction';
import { MatchTabs } from '@/components/match-tabs';
import { Table, TableLegend } from '@/components/table';
import { api } from '@/lib/api';
import {
  headToHeadMeetings,
  isCurrentWeekMatch,
  resolveH2hScope,
  resolveMatchTab,
} from '@/lib/match';
import { formTable, headToHeadCoverageLabel, nextFixtures } from '@/lib/season';
import { buildTeamDirectory, matchDocumentTitle, teamVisual } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const [match, teams] = await Promise.all([api.fixture(id), api.teams()]);
  return {
    title: matchDocumentTitle(
      buildTeamDirectory(teams),
      match.home_team_id,
      match.home_team_name,
      match.away_team_id,
      match.away_team_name,
    ),
  };
}

export default async function Match({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; h2h?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab: requestedTab, h2h: requestedH2h } = await searchParams;
  const match = await api.fixture(id);
  const [teams, seasons, seasonFixtures] = await Promise.all([
    api.teams(),
    api.seasons(),
    api.fixtures(`season_id=${match.season_id}`),
  ]);

  const season = seasons.find((item) => item.id === match.season_id);
  const isCurrentSeason = season?.is_current ?? false;
  const hasPreview = isCurrentWeekMatch(match, seasonFixtures ?? [], isCurrentSeason);
  const tab = resolveMatchTab(requestedTab, hasPreview);
  const h2hScope = resolveH2hScope(requestedH2h);

  const [prediction, standings, priorFixtures] = await Promise.all([
    tab === 'preview' && hasPreview ? api.prediction(match.id) : Promise.resolve(null),
    tab === 'table' ? api.standings(match.season_id) : Promise.resolve(null),
    tab === 'h2h' ? api.fixtures(`team_id=${match.home_team_id}`) : Promise.resolve(null),
  ]);

  const directory = buildTeamDirectory(teams);
  const home = teamVisual(directory, match.home_team_id, match.home_team_name);
  const away = teamVisual(directory, match.away_team_id, match.away_team_name);
  const allMeetings = priorFixtures
    ? headToHeadMeetings(priorFixtures, match.home_team_id, match.away_team_id, match.id)
    : [];

  return (
    <main className="shell match-page">
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
        <MatchTabs fixtureId={match.id} hasPreview={hasPreview} value={tab} />
      </MatchHero>
      {tab === 'table' ? (
        <section
          aria-labelledby="match-table-heading"
          className="match-panel match-panel--table table-page-overview"
        >
          <h2 className="sr-only" id="match-table-heading">
            League table
          </h2>
          {standings?.length ? (
            <>
              <Table
                form={seasonFixtures ? formTable(seasonFixtures, 5) : undefined}
                highlightTeamIds={new Set([match.home_team_id, match.away_team_id])}
                items={standings}
                leagueSize={standings.length}
                nextByTeam={isCurrentSeason ? nextFixtures(seasonFixtures ?? []) : undefined}
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
          fixtures={seasonFixtures ?? []}
          home={home}
          homeTeamId={match.home_team_id}
          prediction={prediction}
          teams={directory}
        />
      ) : null}
    </main>
  );
}
