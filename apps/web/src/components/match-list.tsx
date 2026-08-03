import Link from 'next/link';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture, FixtureStatus } from '@/lib/api';
import { groupByDay } from '@/lib/season';
import { teamVisual, type TeamDirectory } from '@/lib/teams';

const KICKOFF_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

const STATUS_LABEL: Record<Exclude<FixtureStatus, 'scheduled' | 'completed'>, string> = {
  live: 'Live',
  postponed: 'Postp.',
  cancelled: 'Canc.',
};

function isPlayed(fixture: Fixture): boolean {
  return fixture.home_score !== null && fixture.away_score !== null;
}

function StatusCell({ fixture }: { fixture: Fixture }) {
  if (fixture.status === 'completed') return <span className="pill">FT</span>;
  if (fixture.status === 'scheduled')
    return <span>{KICKOFF_TIME.format(new Date(fixture.kickoff_at))}</span>;
  return (
    <span className={fixture.status === 'live' ? 'pill pill--live' : 'pill'}>
      {STATUS_LABEL[fixture.status]}
    </span>
  );
}

function TeamLine({
  teamId,
  name,
  goals,
  beaten,
  directory,
}: {
  teamId: string;
  name: string;
  goals: number | null;
  beaten: boolean;
  directory?: TeamDirectory;
}) {
  const visual = teamVisual(directory, teamId, name);
  return (
    <span className={beaten ? 'team-line team-line--beaten' : 'team-line'}>
      <TeamBadge visual={visual} />
      <span className="team-name">{visual.label}</span>
      <span className="team-goals">{goals ?? ''}</span>
    </span>
  );
}

function MatchRow({ fixture, directory }: { fixture: Fixture; directory?: TeamDirectory }) {
  const played = isPlayed(fixture);
  const home = fixture.home_score;
  const away = fixture.away_score;
  const score = played ? `${home}–${away}` : KICKOFF_TIME.format(new Date(fixture.kickoff_at));
  return (
    <Link
      className="match-row"
      href={`/matches/${fixture.id}`}
      aria-label={`${fixture.home_team_name} versus ${fixture.away_team_name}, ${score}`}
    >
      <span className="match-status">
        <StatusCell fixture={fixture} />
      </span>
      <span className="match-teams">
        <TeamLine
          teamId={fixture.home_team_id}
          name={fixture.home_team_name}
          goals={home}
          beaten={played && home! < away!}
          directory={directory}
        />
        <TeamLine
          teamId={fixture.away_team_id}
          name={fixture.away_team_name}
          goals={away}
          beaten={played && away! < home!}
          directory={directory}
        />
      </span>
      <span className="match-chevron" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

export function MatchList({
  items,
  empty,
  teams,
  columns = false,
}: {
  items: readonly Fixture[];
  empty: string;
  teams?: TeamDirectory;
  columns?: boolean;
}) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <div>
      {groupByDay(items).map((day) => (
        <div key={day.key}>
          <h3 className="day-head">{day.label}</h3>
          <div className={columns ? 'match-grid match-grid--two' : 'match-grid'}>
            {day.fixtures.map((fixture) => (
              <MatchRow directory={teams} fixture={fixture} key={fixture.id} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
