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

function tableLabelFor(teams: TeamDirectory | undefined, row: Standing): string {
  const visual = teamVisual(teams, row.team_id, row.team_name);
  return TABLE_TEAM_LABELS[visual.abbr] ?? visual.label;
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
  /** Narrow overview lists this many clubs; the wide table still shows the full league. */
  mobileLimit?: number;
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
  mobileLimit,
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
  const formStyle = form ? ({ '--form-slots': formSlots } as CSSProperties) : undefined;

  if (overview) {
    const narrowItems = mobileLimit === undefined ? items : items.slice(0, mobileLimit);
    return (
      <>
        <div className="table-scroll table-scroll--wide">
          <OverviewTable
            form={form}
            formStyle={formStyle}
            highlightTeamIds={highlightTeamIds}
            items={items}
            leagueSize={size}
            nextByTeam={nextByTeam}
            showNext={showNext}
            tableClass={tableClass}
            teams={teams}
          />
        </div>
        <div className="table-scroll table-scroll--narrow">
          <OverviewTable
            highlightTeamIds={highlightTeamIds}
            items={narrowItems}
            leagueSize={size}
            narrow
            tableClass="league-table league-table--overview league-table--overview-narrow"
            teams={teams}
          />
        </div>
      </>
    );
  }

  return (
    <div className="table-scroll">
      <table className={tableClass} style={formStyle}>
        {compact ? (
          <colgroup>
            <col className="w-pos" />
            <col />
            <col className="w-num" />
            <col className="w-num" />
            <col className="w-num" />
            {form ? <col className="w-form" /> : null}
          </colgroup>
        ) : null}
        <thead>
          <tr>
            <th className="col-pos" scope="col">
              #
            </th>
            <th className="col-team" scope="col">
              Team
            </th>
            <th scope="col">
              <abbr title="Played">P</abbr>
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
                <th className="hide-mobile" scope="col">
                  <abbr title="Goals for">GF</abbr>
                </th>
                <th className="hide-mobile" scope="col">
                  <abbr title="Goals against">GA</abbr>
                </th>
              </>
            )}
            <th scope="col">
              <abbr title="Goal difference">GD</abbr>
            </th>
            <th scope="col">
              <abbr title="Points">Pts</abbr>
            </th>
            {form ? (
              <th className="col-form" scope="col">
                <span className="form-heading">Form</span>
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const visual = teamVisual(teams, row.team_id, row.team_name);
            const zone = zoneFor(row.position, size);
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
                    <span>{tableLabelFor(teams, row)}</span>
                  </Link>
                </td>
                <td>{row.played}</td>
                {compact ? null : (
                  <>
                    <td className="hide-mobile">{row.won}</td>
                    <td className="hide-mobile">{row.drawn}</td>
                    <td className="hide-mobile">{row.lost}</td>
                    <td className="hide-mobile">{row.goals_for}</td>
                    <td className="hide-mobile">{row.goals_against}</td>
                  </>
                )}
                <td>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
                <td className="points">{row.points}</td>
                {form ? (
                  <td className="col-form">
                    <FormGuide marks={form.get(row.team_id) ?? []} />
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

function OverviewTable({
  form,
  formStyle,
  highlightTeamIds,
  items,
  leagueSize,
  narrow = false,
  nextByTeam,
  showNext = false,
  tableClass,
  teams,
}: {
  form?: ReadonlyMap<string, readonly ResultMark[]>;
  formStyle?: CSSProperties;
  highlightTeamIds?: ReadonlySet<string>;
  items: readonly Standing[];
  leagueSize: number;
  narrow?: boolean;
  nextByTeam?: ReadonlyMap<string, Fixture>;
  showNext?: boolean;
  tableClass: string;
  teams?: TeamDirectory;
}) {
  return (
    <table className={tableClass} style={narrow ? undefined : formStyle}>
      {narrow ? (
        <colgroup>
          <col className="w-overview-pos" />
          <col />
          <col className="w-overview-metric" />
          <col className="w-overview-metric" />
          <col className="w-overview-metric" />
        </colgroup>
      ) : (
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
      )}
      <thead>
        <tr>
          <th className="col-pos" scope="col">
            #
          </th>
          <th className="col-team" scope="col">
            <span className="sr-only">Team</span>
          </th>
          <th scope="col">
            <abbr title="Played">PL</abbr>
          </th>
          {narrow ? null : (
            <>
              <th scope="col">
                <abbr title="Won">W</abbr>
              </th>
              <th scope="col">
                <abbr title="Drawn">D</abbr>
              </th>
              <th scope="col">
                <abbr title="Lost">L</abbr>
              </th>
              <th scope="col">
                <abbr title="Goals for and against">+/-</abbr>
              </th>
            </>
          )}
          <th scope="col">
            <abbr title="Goal difference">GD</abbr>
          </th>
          <th className="col-points" scope="col">
            <abbr title="Points">PTS</abbr>
          </th>
          {narrow || !form ? null : (
            <th className="col-form" scope="col">
              <span className="form-heading">Form</span>
            </th>
          )}
          {narrow || !showNext ? null : (
            <th className="col-next" scope="col">
              Next
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {items.map((row) => {
          const visual = teamVisual(teams, row.team_id, row.team_name);
          const zone = narrow ? null : zoneFor(row.position, leagueSize);
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
                {narrow ? null : <span className={zone ? `zone zone--${zone}` : 'zone'} />}
                {row.position}
              </td>
              <td className="col-team">
                <Link className="team-cell" href={`/teams/${row.team_id}`}>
                  <TeamBadge visual={visual} />
                  <span>{tableLabelFor(teams, row)}</span>
                </Link>
              </td>
              <td>{row.played}</td>
              {narrow ? null : (
                <>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td className="goals-pair">
                    {row.goals_for}–{row.goals_against}
                  </td>
                </>
              )}
              <td>{row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}</td>
              <td className="points">{row.points}</td>
              {narrow || !form ? null : (
                <td className="col-form">
                  <FormGuide marks={form.get(row.team_id) ?? []} />
                </td>
              )}
              {narrow || !showNext ? null : (
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
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function TableLegend({ showRelegation = true }: { showRelegation?: boolean }) {
  return (
    <div className="legend hide-mobile">
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
