import Link from 'next/link';
import type { Standing } from '@/lib/api';
export function Table({ items }: { items: Standing[] }) {
  return (
    <table className="league-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Team</th>
          <th>P</th>
          <th className="hide-mobile">W</th>
          <th className="hide-mobile">D</th>
          <th className="hide-mobile">L</th>
          <th>GD</th>
          <th>Pts</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r) => (
          <tr key={r.team_id}>
            <td>{r.position}</td>
            <td>
              <Link href={`/teams/${r.team_id}`}>{r.team_name}</Link>
            </td>
            <td>{r.played}</td>
            <td className="hide-mobile">{r.won}</td>
            <td className="hide-mobile">{r.drawn}</td>
            <td className="hide-mobile">{r.lost}</td>
            <td>{r.goal_difference}</td>
            <td className="points">{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
