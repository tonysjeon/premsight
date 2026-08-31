import type { CSSProperties } from 'react';
import { TeamBadge } from '@/components/team-badge';
import type { Player } from '@/lib/api';
import { playerCompareName, type CompareAxis } from '@/lib/compare-position';
import { initialsFor, teamVisual } from '@/lib/teams';

type CompareStatTableProps = {
  axes: CompareAxis[];
  players: Player[];
  colors: string[];
  onRemove: (playerId: string) => void;
};

function formatPercentile(value: number | null): string {
  if (value === null || Number.isNaN(value)) return '—';
  return value.toFixed(1);
}

function playerBadge(player: Player) {
  const name = player.team_name ?? player.display_name;
  const visual = teamVisual(undefined, player.team_id ?? '', name);
  return {
    ...visual,
    abbr: player.team_tla ?? visual.abbr ?? initialsFor(name),
    crestUrl: player.team_crest_url ?? visual.crestUrl,
  };
}

export function CompareStatTable({ axes, players, colors, onRemove }: CompareStatTableProps) {
  if (players.length === 0) return null;

  return (
    <div className="compare-stat-board">
      <table className="compare-stat-table">
        <colgroup>
          <col className="compare-stat-col-player" />
          {axes.map((axis) => (
            <col className="compare-stat-col-metric" key={axis.axis} />
          ))}
          <col className="compare-stat-col-remove" />
        </colgroup>
        <thead>
          <tr className="compare-stat-head">
            <th className="compare-stat-head-label" scope="col">
              Player
            </th>
            {axes.map((axis) => (
              <th className="compare-stat-head-metric" key={axis.axis} scope="col">
                {axis.label}
              </th>
            ))}
            <th className="compare-stat-head-spacer" scope="col">
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr
              className="compare-stat-row"
              key={player.id}
              style={{ '--row-color': colors[index] ?? 'var(--text)' } as CSSProperties}
            >
              <td className="compare-stat-id">
                <TeamBadge visual={playerBadge(player)} />
                <p className="compare-stat-name">{playerCompareName(player)}</p>
              </td>
              {axes.map((axis) => (
                <td className="compare-stat-value" key={`${player.id}-${axis.axis}`}>
                  {formatPercentile(axis.values[index] ?? 0)}
                </td>
              ))}
              <td className="compare-stat-remove-cell">
                <button
                  aria-label={`Remove ${playerCompareName(player)}`}
                  className="compare-stat-remove"
                  onClick={() => onRemove(player.id)}
                  type="button"
                >
                  <svg viewBox="0 0 12 12">
                    <path d="M3 3l6 6M9 3l-6 6" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
