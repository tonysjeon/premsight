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
  const canPredict = match.status === 'scheduled' || match.status === 'postponed';
  const [teams, prediction] = await Promise.all([
    api.teams(),
    canPredict ? api.prediction(match.id) : Promise.resolve(null),
  ]);
  const directory = buildTeamDirectory(teams);
  const home = teamVisual(directory, match.home_team_id, match.home_team_name);
  const away = teamVisual(directory, match.away_team_id, match.away_team_name);
  const outcomes = prediction
    ? [
        { label: home.abbr, value: prediction.outcomes.home_win },
        { label: 'Draw', value: prediction.outcomes.draw },
        { label: away.abbr, value: prediction.outcomes.away_win },
      ]
    : [];
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
      {prediction ? (
        <section className="prediction-card" aria-labelledby="prediction-heading">
          <div className="prediction-heading">
            <div>
              <p className="eyebrow">Pre-match probabilities</p>
              <h2 id="prediction-heading">Model estimate</h2>
            </div>
            <span>{prediction.model_version}</span>
          </div>
          <div className="probability-grid">
            {outcomes.map((outcome) => (
              <div className="probability" key={outcome.label}>
                <div>
                  <span>{outcome.label}</span>
                  <strong>{Math.round(outcome.value * 100)}%</strong>
                </div>
                <div className="probability-track" aria-hidden="true">
                  <span style={{ width: `${outcome.value * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="prediction-summary">
            <span>
              Expected goals <strong>{prediction.expected_goals.home.toFixed(1)}</strong> –{' '}
              <strong>{prediction.expected_goals.away.toFixed(1)}</strong>
            </span>
            <span>
              Most likely score{' '}
              <strong>
                {prediction.likely_scores[0]?.home_goals ?? 0}–
                {prediction.likely_scores[0]?.away_goals ?? 0}
              </strong>
            </span>
          </div>
        </section>
      ) : null}
    </main>
  );
}
