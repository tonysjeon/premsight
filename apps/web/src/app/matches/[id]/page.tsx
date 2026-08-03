import Link from 'next/link';
import type { Metadata } from 'next';
import { api } from '@/lib/api';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const m = await api.fixture((await params).id);
  return { title: `${m.home_team_name} vs ${m.away_team_name}` };
}
export default async function Match({ params }: { params: Promise<{ id: string }> }) {
  const m = await api.fixture((await params).id);
  return (
    <main className="wrap page">
      <p className="eyebrow">{m.status}</p>
      <div className="scorecard">
        <Link href={`/teams/${m.home_team_id}`}>{m.home_team_name}</Link>
        <strong>
          {m.home_score ?? '–'} <span>:</span> {m.away_score ?? '–'}
        </strong>
        <Link href={`/teams/${m.away_team_id}`}>{m.away_team_name}</Link>
      </div>
      <p className="match-meta">
        {new Intl.DateTimeFormat('en-GB', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: 'UTC',
        }).format(new Date(m.kickoff_at))}{' '}
        UTC{m.venue ? ` · ${m.venue}` : ''}
      </p>
    </main>
  );
}
