import type { Metadata } from 'next';
import { MatchPageView } from '@/components/match-page-view';
import { api } from '@/lib/api';
import { loadFixture, loadFixtures, loadSeasons, loadStandings, loadTeams } from '@/lib/football-load';
import { isCurrentWeekMatch, resolveH2hScope, resolveMatchTab } from '@/lib/match';
import { buildTeamDirectory, matchDocumentTitle } from '@/lib/teams';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const id = (await params).id;
  const [match, teams] = await Promise.all([loadFixture(id), loadTeams()]);
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
  const match = await loadFixture(id);
  const [teams, seasons, seasonFixtures] = await Promise.all([
    loadTeams(),
    loadSeasons(),
    loadFixtures(`season_id=${match.season_id}`),
  ]);

  const season = seasons.find((item) => item.id === match.season_id);
  const isCurrentSeason = season?.is_current ?? false;
  const hasPreview = isCurrentWeekMatch(match, seasonFixtures ?? [], isCurrentSeason);
  const tab = resolveMatchTab(requestedTab, hasPreview);
  const h2hScope = resolveH2hScope(requestedH2h);

  const [prediction, standings, homeFixtures] = await Promise.all([
    hasPreview ? api.prediction(match.id) : Promise.resolve(null),
    loadStandings(match.season_id),
    loadFixtures(`team_id=${match.home_team_id}`),
  ]);

  return (
    <main className="shell match-page">
      <MatchPageView
        hasPreview={hasPreview}
        h2hScope={h2hScope}
        homeFixtures={homeFixtures}
        isCurrentSeason={isCurrentSeason}
        match={match}
        prediction={prediction}
        seasonFixtures={seasonFixtures}
        seasons={seasons}
        standings={standings}
        tab={tab}
        teams={teams}
      />
    </main>
  );
}
