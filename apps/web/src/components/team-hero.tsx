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
          <p>England</p>
        </div>
      </div>
      {children}
    </header>
  );
}
