import type { ReactNode } from 'react';
import { MatchBack } from '@/components/match-back';
import { TeamBadge } from '@/components/team-badge';
import type { TeamVisual } from '@/lib/teams';

export function TeamHero({
  competitionName,
  name,
  visual,
  children,
}: {
  competitionName: string;
  name: string;
  visual: TeamVisual;
  children?: ReactNode;
}) {
  return (
    <header className="match-hero">
      <div className="match-toolbar">
        <MatchBack />
        <p className="match-round">
          <span aria-hidden="true" className="match-round-mark" />
          {competitionName}
        </p>
      </div>
      <div className="team-identity">
        <TeamBadge size="hero" visual={visual} />
        <div>
          <h1>{name}</h1>
          {visual.city ? (
            <p className="team-identity-place">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
              {visual.city}
            </p>
          ) : null}
        </div>
      </div>
      {children}
    </header>
  );
}
