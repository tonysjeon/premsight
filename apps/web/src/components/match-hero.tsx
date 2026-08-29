import type { ReactNode } from 'react';
import Link from 'next/link';
import { GiSoccerField } from 'react-icons/gi';
import { KickoffTime, LocalKickoffFact, LocalKickoffRelative } from '@/components/local-kickoff';
import { MatchBack } from '@/components/match-back';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture } from '@/lib/api';
import { matchRoundLabel } from '@/lib/season';
import { matchdayTeamLabel, type TeamVisual } from '@/lib/teams';

function centreCopy(match: Fixture): { primary: ReactNode; secondary: ReactNode } {
  if (match.status === 'completed') {
    return {
      primary: `${match.home_score ?? '–'} - ${match.away_score ?? '–'}`,
      secondary: 'Full time',
    };
  }
  if (match.status === 'live') {
    return {
      primary: `${match.home_score ?? 0} - ${match.away_score ?? 0}`,
      secondary: 'Live',
    };
  }
  if (match.status === 'cancelled') {
    return { primary: '–', secondary: 'Cancelled' };
  }
  if (match.status === 'postponed') {
    return { primary: '–', secondary: 'Postponed' };
  }
  return {
    primary: <KickoffTime value={match.kickoff_at} />,
    secondary: <LocalKickoffRelative value={match.kickoff_at} />,
  };
}

export function MatchHero({
  match,
  home,
  away,
  competitionName,
  seasonName,
  isCurrentSeason = true,
  children,
}: {
  match: Fixture;
  home: TeamVisual;
  away: TeamVisual;
  competitionName: string;
  seasonName?: string;
  isCurrentSeason?: boolean;
  children?: ReactNode;
}) {
  const centre = centreCopy(match);
  const round = matchRoundLabel(competitionName, match.matchday, seasonName, isCurrentSeason);
  return (
    <header className="match-hero">
      <div className="match-toolbar">
        <MatchBack />
        <p className="match-round">
          <span aria-hidden="true" className="match-round-mark" />
          {round}
        </p>
      </div>
      <ul className="match-facts">
        <li>
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <rect fill="none" height="11" rx="1.5" width="12" x="2" y="3" />
            <path d="M2 6.5h12M5.5 2v3M10.5 2v3" />
          </svg>
          <LocalKickoffFact value={match.kickoff_at} />
        </li>
        {match.venue ? (
          <li>
            <GiSoccerField aria-hidden="true" className="fact-icon" />
            {match.venue}
          </li>
        ) : null}
      </ul>
      <div className="match-board">
        <Link className="match-board-team" href={`/teams/${match.home_team_id}`}>
          <TeamBadge size="hero" visual={home} />
          <span className="match-board-team-name">{matchdayTeamLabel(home)}</span>
        </Link>
        <div className="match-board-centre">
          <strong>{centre.primary}</strong>
          <span className={match.status === 'live' ? 'match-board-live' : undefined}>
            {centre.secondary}
          </span>
        </div>
        <Link
          className="match-board-team match-board-team--away"
          href={`/teams/${match.away_team_id}`}
        >
          <TeamBadge size="hero" visual={away} />
          <span className="match-board-team-name">{matchdayTeamLabel(away)}</span>
        </Link>
      </div>
      {children}
    </header>
  );
}
