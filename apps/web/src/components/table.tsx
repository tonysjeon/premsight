import type { CSSProperties } from 'react';
import Link from 'next/link';
import { FormGuide } from '@/components/form-guide';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture, Standing } from '@/lib/api';
import type { ResultMark } from '@/lib/season';
import { matchdayTeamLabel, teamVisual, type TeamDirectory } from '@/lib/teams';

type Zone = 'ucl' | 'uel' | 'drop' | null;

const TABLE_TEAM_LABELS: Readonly<Record<string, string>> = {
  BHA: 'Brighton & Hove Albion',
  MCI: 'Manchester City',
  MUN: 'Manchester United',
  NEW: 'Newcastle United',
  NOT: 'Nottingham Forest',
  TOT: 'Tottenham Hotspur',
};

const NEXT_FIXTURE_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
});

function zoneFor(position: number, leagueSize: number): Zone {
  if (position <= 4) return 'ucl';
  if (position === 5) return 'uel';
  if (leagueSize >= 10 && position > leagueSize - 3) return 'drop';
  return null;
}

type TableProps = {
  items: readonly Standing[];
  teams?: TeamDirectory;
  form?: ReadonlyMap<string, readonly ResultMark[]>;
  /** Full league size, so a truncated snapshot still colours zones correctly. */
  leagueSize?: number;
  /** Drops per-result and goal columns for narrow layouts such as the home rail. */
  compact?: boolean;
  /** Keeps core result columns while omitting goals for/against on overview layouts. */
  overview?: boolean;
  /** Earliest unplayed fixture keyed by team ID. When omitted, the Next column is hidden. */
  nextByTeam?: ReadonlyMap<string, Fixture>;
  /** Emphasises participating clubs on the match-hub table tab. */
  highlightTeamIds?: ReadonlySet<string>;
};

export function Table({
  items,
  teams,
  form,
  leagueSize,
  compact = false,
  overview = false,
  nextByTeam,
  highlightTeamIds,
}: TableProps) {
  const size = leagueSize ?? items.length;
  const showNext = overview && nextByTeam !== undefined;
  const formSlots = form
    ? items.reduce((widest, row) => Math.max(widest, form.get(row.team_id)?.length ?? 0), 0)
    : 0;
  const tableClass = compact
    ? 'league-table league-table--compact'
    : overview
      ? `league-table league-table--overview${showNext ? '' : ' league-table--no-next'}`
      : 'league-table';
  return (
    <div className="table-scroll">
      <table
        className={tableClass}
        style={form ? ({ '--form-slots': formSlots } as CSSProperties) : undefined}
      >
        {compact ? (
          <colgroup>
            <col className="w-pos" />
            <col />
            <col className="w-num" />
            <col className="w-num" />
            <col className="w-num" />
            {form ? <col className="w-form" /> : null}
          </colgroup>
        ) : overview ? (
          <colgroup>
            <col className="w-overview-pos" />
            <col />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            <col className="w-overview-metric" />
            {form ? <col className="w-overview-form" /> : null}
            {showNext ? <col className="w-overview-next" /> : null}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            <th className="col-pos" scope="col">
              #
            </th>
            <th className="col-team" scope="col">
              {overview ? <span className="sr-only">Team</span> : 'Team'}
            </th>
            <th scope="col">
              <abbr title="Played">{overview ? 'PL' : 'P'}</abbr>
            </th>
            {compact ? null : (
              <>
                <th className="hide-mobile" scope="col">
                  <abbr title="Won">W</abbr>
                </th>
                <th className="hide-mobile" scope="col">
                  <abbr title="Drawn">D</abbr>
                </th>
                <th className="hide-mobile" scope="col">
                  <abbr title="Lost">L</abbr>
                </th>
                {overview ? null : (
                  <>
                    <th className="hide-mobile" scope="col">
                      <abbr title="Goals for">GF</abbr>
                    </th>
                    <th className="hide-mobile" scope="col">
                      <abbr title="Goals against">GA</abbr>
                    </th>
                  </>
                )}
              </>
            )}
            {overview ? (
              <th className="hide-mobile" scope="col">
                <abbr title="Goals for and against">+/-</abbr>
              </th>
            ) : null}
            <th className={overview ? 'hide-narrow' : undefined} scope="col">
              <abbr title="Goal difference">GD</abbr>
            </th>
            <th className={overview ? 'col-points' : undefined} scope="col">
              <abbr title="Points">Pts</abbr>
            </th>
            {form ? (
              <th className="col-form" scope="col">
                <span className="form-heading">Form</span>
              </th>
            ) : null}
            {showNext ? (
              <th className="col-next" scope="col">
                Next
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const visual = teamVisual(teams, row.team_id, row.team_name);
            const tableLabel = TABLE_TEAM_LABELS[visual.abbr] ?? visual.label;
            const zone = zoneFor(row.position, size);
            const nextFixture = nextByTeam?.get(row.team_id);
            const opponent = nextFixture
              ? nextFixture.home_team_id === row.team_id
                ? teamVisual(teams, nextFixture.away_team_id, nextFixture.away_team_name)
                : teamVisual(teams, nextFixture.home_team_id, nextFixture.home_team_name)
              : null;
            const nextHome = nextFixture
              ? teamVisual(teams, nextFixture.home_team_id, nextFixture.home_team_name)
              : null;
            const nextAway = nextFixture
              ? teamVisual(teams, nextFixture.away_team_id, nextFixture.away_team_name)
              : null;
            const nextFixtureLabel =
              nextFixture && nextHome && nextAway
                ? `${NEXT_FIXTURE_DATE.format(new Date(nextFixture.kickoff_at))}: ${matchdayTeamLabel(nextHome)} vs. ${matchdayTeamLabel(nextAway)}`
                : null;
            return (
              <tr
                className={highlightTeamIds?.has(row.team_id) ? 'is-match-team' : undefined}
                key={row.team_id}
              >
                <td className="col-pos">
                  <span className={zone ? `zone zone--${zone}` : 'zone'} />
                  {row.position}
                </td>
                <td className="col-team">
                  <Link className="team-cell" href={`/teams/${row.team_id}`}>
                    <TeamBadge visual={visual} />
                    <span>{tableLabel}</span>
                  </Link>
                </td>
                <td>{row.played}</td>
                {compact ? null : (
                  <>
                    <td className="hide-mobile">{row.won}</td>
                    <td className="hide-mobile">{row.drawn}</td>
                    <td className="hide-mobile">{row.lost}</td>
                    {overview ? null : (
                      <>
                        <td className="hide-mobile">{row.goals_for}</td>
                        <td className="hide-mobile">{row.goals_against}</td>
                      </>
                    )}
                  </>
                )}
                {overview ? (
                  <td className="hide-mobile goals-pair">
                    {row.goals_for}–{row.goals_against}
                  </td>
                ) : null}
                <td className={overview ? 'hide-narrow' : undefined}>
                  {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                </td>
                <td className="points">{row.points}</td>
                {form ? (
                  <td className="col-form">
                    <FormGuide marks={form.get(row.team_id) ?? []} />
                  </td>
                ) : null}
                {showNext ? (
                  <td className="col-next">
                    {opponent && nextFixture && nextFixtureLabel ? (
                      <Link
                        aria-label={`View ${nextFixtureLabel}`}
                        className="next-opponent"
                        data-tooltip={nextFixtureLabel}
                        href={`/matches/${nextFixture.id}`}
                      >
                        <TeamBadge visual={opponent} />
                      </Link>
                    ) : (
                      <span className="next-none">–</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TableLegend({ showRelegation = true }: { showRelegation?: boolean }) {
  return (
    <div className="legend">
      <span>
        <i className="zone zone--ucl" /> Champions League
      </span>
      <span>
        <i className="zone zone--uel" /> Europa League
      </span>
      {showRelegation ? (
        <span>
          <i className="zone zone--drop" /> Relegation
        </span>
      ) : null}
    </div>
  );
}
