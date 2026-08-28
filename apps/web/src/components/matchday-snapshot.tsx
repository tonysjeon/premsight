import Link from 'next/link';
import { KickoffTime, LocalDayLabel } from '@/components/local-kickoff';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture } from '@/lib/api';
import { groupByDay } from '@/lib/season';
import { matchdayTeamLabel, teamVisual, type TeamDirectory } from '@/lib/teams';

function matchLabel(fixture: Fixture) {
  if (fixture.status === 'live') {
    return `${fixture.home_score ?? 0}–${fixture.away_score ?? 0}`;
  }
  if (fixture.home_score !== null && fixture.away_score !== null) {
    return `${fixture.home_score}–${fixture.away_score}`;
  }
  if (fixture.status === 'postponed') return 'Postp.';
  if (fixture.status === 'cancelled') return 'Canc.';
  return <KickoffTime value={fixture.kickoff_at} />;
}

function resultCaption(fixture: Fixture): string | null {
  if (fixture.status === 'completed') return 'FT';
  if (fixture.status === 'live') return 'Live';
  return null;
}

function resultSpoken(fixture: Fixture): string {
  if (fixture.status === 'completed') return ', full time';
  if (fixture.status === 'live') return ', live';
  return '';
}

function FixtureRow({
  fixture,
  teams,
  dateIso,
  includeYear,
}: {
  fixture: Fixture;
  teams: TeamDirectory;
  dateIso?: string;
  includeYear?: boolean;
}) {
  const home = teamVisual(teams, fixture.home_team_id, fixture.home_team_name);
  const away = teamVisual(teams, fixture.away_team_id, fixture.away_team_name);
  const caption = resultCaption(fixture);
  const dated = Boolean(dateIso);
  return (
    <Link
      aria-label={`${fixture.home_team_name} versus ${fixture.away_team_name}${resultSpoken(fixture)}`}
      className={dated ? 'round-match round-match--dated' : 'round-match'}
      href={`/matches/${fixture.id}`}
    >
      {dateIso ? (
        <span className="round-match-date">
          <LocalDayLabel includeYear={includeYear} value={dateIso} />
        </span>
      ) : null}
      <span className="round-team round-team--home">{matchdayTeamLabel(home)}</span>
      <TeamBadge visual={home} />
      <span className="round-result">
        <strong>{matchLabel(fixture)}</strong>
        {caption ? (
          <small
            aria-hidden="true"
            className={fixture.status === 'live' ? 'round-result-live' : undefined}
          >
            {caption}
          </small>
        ) : null}
      </span>
      <TeamBadge visual={away} />
      <span className="round-team">{matchdayTeamLabel(away)}</span>
    </Link>
  );
}

function FixtureDays({
  items,
  teams,
  dateOnCard = false,
  includeYear,
}: {
  items: readonly Fixture[];
  teams: TeamDirectory;
  dateOnCard?: boolean;
  includeYear?: boolean;
}) {
  if (dateOnCard) {
    return items.map((fixture) => (
      <FixtureRow
        dateIso={fixture.kickoff_at}
        fixture={fixture}
        includeYear={includeYear}
        key={fixture.id}
        teams={teams}
      />
    ));
  }

  return groupByDay(items).map((day) => (
    <div key={day.key}>
      <h3 className="round-day">
        <LocalDayLabel includeYear={includeYear} value={day.fixtures[0]!.kickoff_at} />
      </h3>
      {day.fixtures.map((fixture) => (
        <FixtureRow fixture={fixture} includeYear={includeYear} key={fixture.id} teams={teams} />
      ))}
    </div>
  ));
}

export function MatchdaySnapshot({
  items,
  periodLabel,
  teams,
  includeYear,
  dateOnCard = false,
  empty = 'No matches are available for this round.',
}: {
  items: readonly Fixture[];
  periodLabel?: string;
  teams: TeamDirectory;
  includeYear?: boolean;
  dateOnCard?: boolean;
  empty?: string;
}) {
  if (!items.length) return <p className="empty">{empty}</p>;

  if (periodLabel || dateOnCard) {
    return (
      <div className="fixture-period-list">
        <section className="fixture-period">
          {periodLabel ? <h2 className="fixture-period-title">{periodLabel}</h2> : null}
          <div className="round-list round-list--cards">
            <FixtureDays dateOnCard includeYear={includeYear} items={items} teams={teams} />
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="round-list round-list--matchday">
      <FixtureDays includeYear={includeYear} items={items} teams={teams} />
    </div>
  );
}
