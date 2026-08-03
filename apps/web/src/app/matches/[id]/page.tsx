import type { Metadata } from 'next';
import Link from 'next/link';
import { TeamBadge } from '@/components/team-badge';
import { api } from '@/lib/api';
import { buildTeamDirectory, teamVisual } from '@/lib/teams';

const KICKOFF = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'full',
  timeStyle: 'short',
  hour12: true,
  timeZone: 'UTC',
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const match = await api.fixture((await params).id);
  return { title: `${match.home_team_name} vs ${match.away_team_name}` };
}

export default async function Match({ params }: { params: Promise<{ id: string }> }) {
  const match = await api.fixture((await params).id);
  const directory = buildTeamDirectory(await api.teams());
  const home = teamVisual(directory, match.home_team_id, match.home_team_name);
  const away = teamVisual(directory, match.away_team_id, match.away_team_name);
  return (
    <main className="shell page">
      <p className="eyebrow">
        {match.status === 'completed' ? 'Full time' : match.status}
        {match.matchday === null ? '' : ` · Matchday ${match.matchday}`}
      </p>
      <div className="scorecard">
        <Link className="scorecard-team" href={`/teams/${match.home_team_id}`}>
          <TeamBadge large visual={home} />
          {home.label}
        </Link>
        <strong>
          {match.home_score ?? '–'} <span>:</span> {match.away_score ?? '–'}
        </strong>
        <Link className="scorecard-team" href={`/teams/${match.away_team_id}`}>
          <TeamBadge large visual={away} />
          {away.label}
        </Link>
      </div>
      <p className="match-meta">
        {KICKOFF.format(new Date(match.kickoff_at))} UTC{match.venue ? ` · ${match.venue}` : ''}
      </p>
    </main>
  );
}
