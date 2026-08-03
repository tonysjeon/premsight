import type { Metadata } from 'next';
import { Card } from '@/components/card';
import { MatchList } from '@/components/match-list';
import { TeamBadge } from '@/components/team-badge';
import { api } from '@/lib/api';
import { buildTeamDirectory, teamVisual } from '@/lib/teams';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return { title: (await api.team((await params).id)).name };
}

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const team = await api.team((await params).id);
  const teams = await api.teams();
  const directory = buildTeamDirectory(teams);
  const fixtures = team.fixtures ?? [];
  const visual = teamVisual(directory, team.id, team.name);
  return (
    <main className="shell page">
      <div className="league-bar">
        <TeamBadge large visual={visual} />
        <div>
          <h1>{team.name}</h1>
          <p className="league-meta">
            <span>{team.tla ?? 'Premier League club'}</span>
            <span>{fixtures.length} matches this season</span>
          </p>
        </div>
      </div>
      <Card flush title="Results &amp; fixtures">
        <MatchList empty="No fixtures found for this team." items={fixtures} teams={directory} />
      </Card>
    </main>
  );
}
