import Link from 'next/link';
import { FormGuide } from '@/components/form-guide';
import { TeamBadge } from '@/components/team-badge';
import type { Standing } from '@/lib/api';
import type { ResultMark } from '@/lib/season';
import { teamVisual, type TeamDirectory } from '@/lib/teams';

type Zone = 'ucl' | 'uel' | 'drop' | null;

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
};

export function Table({
  items,
  teams,
  form,
  leagueSize,
  compact = false,
  overview = false,
}: TableProps) {
  const size = leagueSize ?? items.length;
  return (
    <div className="table-scroll">
      <table className={compact ? 'league-table league-table--compact' : 'league-table'}>
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
            <th scope="col">
              <abbr title="Goal difference">GD</abbr>
            </th>
            <th scope="col">
              <abbr title="Points">Pts</abbr>
            </th>
            {form ? (
              <th className="col-form" scope="col">
                Form
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const visual = teamVisual(teams, row.team_id, row.team_name);
            const zone = zoneFor(row.position, size);
            return (
              <tr key={row.team_id}>
                <td className="col-pos">
                  <span className={zone ? `zone zone--${zone}` : 'zone'} />
                  {row.position}
                </td>
                <td className="col-team">
                  <Link className="team-cell" href={`/teams/${row.team_id}`}>
                    <TeamBadge visual={visual} />
                    <span>{visual.label}</span>
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
