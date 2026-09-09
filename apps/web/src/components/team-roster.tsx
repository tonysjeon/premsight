'use client';

import Image from 'next/image';
import type { Player } from '@/lib/api';
import { nationalityFlagUrl } from '@/lib/draft-artwork';
import { nationalityName } from '@/lib/nationality';

export function TeamRoster({ players }: { players: Player[] }) {
  if (!players.length) {
    return <p className="empty">No roster information available for this season.</p>;
  }

  return (
    <div className="roster-scroll">
      <table className="league-table league-table--overview roster-list" aria-label="Team roster">
        <thead>
          <tr>
            <th scope="col" className="roster-name-column">
              Player
            </th>
            <th scope="col" className="roster-positions">
              Positions
            </th>
            <th scope="col" className="roster-country-column">
              Country
            </th>
            <th scope="col" className="roster-number">
              Shirt
            </th>
            <th scope="col" className="roster-age">
              Age
            </th>
            <th scope="col" className="roster-height">
              Height
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const flagUrl = nationalityFlagUrl(player.nationality_code);
            return (
              <tr key={player.id}>
                <td className="roster-name-column">
                  <span className="team-cell roster-player-name">
                    <span>{player.display_name}</span>
                  </span>
                </td>
                <td className="roster-positions">
                  {(player.positions?.length ? player.positions : [player.position]).join(', ')}
                </td>
                <td className="roster-country-column">
                  <span className="roster-country">
                    {flagUrl ? (
                      <Image
                        className="roster-flag"
                        src={flagUrl}
                        alt=""
                        width={16}
                        height={16}
                        unoptimized
                      />
                    ) : null}
                    <span>{nationalityName(player.nationality_code)}</span>
                  </span>
                </td>
                <td className="roster-number">
                  <span
                    aria-label={
                      player.squad_number == null
                        ? 'Shirt number unavailable'
                        : `Shirt number ${player.squad_number}`
                    }
                  >
                    {player.squad_number ?? '—'}
                  </span>
                </td>
                <td className="roster-age">{player.age ?? '—'}</td>
                <td className="roster-height">
                  {player.height_inches == null
                    ? '—'
                    : `${Math.floor(player.height_inches / 12)}′${player.height_inches % 12}″`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
