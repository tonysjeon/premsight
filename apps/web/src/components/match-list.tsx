import Link from 'next/link';
import type { Fixture } from '@/lib/api';
export function MatchList({ items, empty }: { items: Fixture[]; empty: string }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div className="matches">
      {items.map((m) => (
        <Link className="match" href={`/matches/${m.id}`} key={m.id}>
          <span className="match-time">
            {m.status === 'completed'
              ? 'Full time'
              : new Intl.DateTimeFormat('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'UTC',
                }).format(new Date(m.kickoff_at))}
          </span>
          <span className="teams">
            <span>{m.home_team_name}</span>
            <span>{m.away_team_name}</span>
          </span>
          <span className="score">
            {m.home_score ?? '–'}
            <br />
            {m.away_score ?? '–'}
          </span>
        </Link>
      ))}
    </div>
  );
}
