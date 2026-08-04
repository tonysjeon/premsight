import Link from 'next/link';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture } from '@/lib/api';
import { groupByDay } from '@/lib/season';
import { matchdayTeamLabel, teamVisual, type TeamDirectory } from '@/lib/teams';

const MATCHDAY_DAY_LABEL = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

const KICKOFF_TIME = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'UTC',
});

function KickoffTime({ value }: { value: string }) {
  const parts = KICKOFF_TIME.formatToParts(new Date(value));
  const period = parts.find((part) => part.type === 'dayPeriod')?.value;
  const clock = parts
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .trim();
  return (
    <span className="kickoff-time">
      <span>{clock}</span>
      {period ? <small>{period}</small> : null}
    </span>
  );
}

function matchLabel(fixture: Fixture) {
  if (fixture.home_score !== null && fixture.away_score !== null) {
    return `${fixture.home_score}–${fixture.away_score}`;
  }
  if (fixture.status === 'live') return 'Live';
  if (fixture.status === 'postponed') return 'Postp.';
  if (fixture.status === 'cancelled') return 'Canc.';
  return <KickoffTime value={fixture.kickoff_at} />;
}

export function MatchdaySnapshot({
  items,
  teams,
}: {
  items: readonly Fixture[];
  teams: TeamDirectory;
}) {
  if (!items.length) return <p className="empty">No matches are available for this matchday.</p>;

  return (
    <div className="round-list">
      {groupByDay(items).map((day) => (
        <div key={day.key}>
          <h3 className="round-day">
            {MATCHDAY_DAY_LABEL.format(new Date(day.fixtures[0]!.kickoff_at))}
          </h3>
          {day.fixtures.map((fixture) => {
            const home = teamVisual(teams, fixture.home_team_id, fixture.home_team_name);
            const away = teamVisual(teams, fixture.away_team_id, fixture.away_team_name);
            return (
              <Link
                aria-label={`${fixture.home_team_name} versus ${fixture.away_team_name}`}
                className="round-match"
                href={`/matches/${fixture.id}`}
                key={fixture.id}
              >
                <span>{matchdayTeamLabel(home)}</span>
                <TeamBadge visual={home} />
                <strong>{matchLabel(fixture)}</strong>
                <TeamBadge visual={away} />
                <span>{matchdayTeamLabel(away)}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
