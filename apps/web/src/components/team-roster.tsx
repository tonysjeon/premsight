import Image from 'next/image';
import Link from 'next/link';
import type { Player, PlayerPosition } from '@/lib/api';
import { nationalityFlagUrl } from '@/lib/draft-artwork';

const POSITION_ORDER: readonly { key: PlayerPosition; title: string }[] = [
  { key: 'GK', title: 'Goalkeepers' },
  { key: 'DEF', title: 'Defenders' },
  { key: 'MID', title: 'Midfielders' },
  { key: 'FWD', title: 'Forwards' },
];

export function TeamRoster({ players }: { players: Player[] }) {
  if (!players.length) {
    return <p className="empty">No roster information available for this season.</p>;
  }

  const grouped = POSITION_ORDER.map(({ key, title }) => ({
    key,
    title,
    players: players.filter((p) => p.position === key),
  })).filter((group) => group.players.length > 0);

  return (
    <div className="team-roster-sections">
      {grouped.map((group) => (
        <section
          aria-labelledby={`roster-group-${group.key}`}
          className="roster-group"
          key={group.key}
        >
          <h3 className="roster-group-heading" id={`roster-group-${group.key}`}>
            {group.title} <span className="roster-group-count">{group.players.length}</span>
          </h3>
          <div className="roster-grid">
            {group.players.map((player) => {
              const flagUrl = nationalityFlagUrl(player.nationality_code);
              const playerRef = player.slug || player.id;
              const detailedPositions = (player.positions ?? []).filter(
                (pos) => !['GK', 'DEF', 'MID', 'FWD'].includes(pos),
              );

              return (
                <div className="roster-card" key={player.id}>
                  <div className="roster-card-photo-wrap">
                    {player.photo_url ? (
                      <Image
                        alt=""
                        className="roster-card-photo"
                        height={64}
                        loading="lazy"
                        src={player.photo_url}
                        unoptimized
                        width={64}
                      />
                    ) : (
                      <div className="roster-card-photo-fallback">
                        {player.display_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    {player.squad_number ? (
                      <span className="roster-squad-number">#{player.squad_number}</span>
                    ) : null}
                  </div>

                  <div className="roster-card-body">
                    <div className="roster-card-top">
                      <span className="roster-player-name">{player.display_name}</span>
                      {flagUrl ? (
                        <Image
                          alt={player.nationality_code ?? ''}
                          className="roster-player-flag"
                          height={14}
                          src={flagUrl}
                          unoptimized
                          width={20}
                        />
                      ) : null}
                    </div>

                    <div className="roster-card-meta">
                      <span className="roster-pos-badge">{player.position}</span>
                      {detailedPositions.length > 0 ? (
                        <span className="roster-detailed-positions">
                          {detailedPositions.join(' · ')}
                        </span>
                      ) : null}
                    </div>

                    <div className="roster-card-actions">
                      <Link
                        className="roster-compare-btn"
                        href={`/compare?player=${encodeURIComponent(playerRef)}`}
                      >
                        Compare
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
