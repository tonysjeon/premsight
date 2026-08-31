'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LocalListDate } from '@/components/local-kickoff';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture } from '@/lib/api';
import { replacePath } from '@/lib/client-nav';
import { headToHeadRecord, type H2hScope } from '@/lib/match';
import { matchdayTeamLabel, teamVisual, type TeamDirectory, type TeamVisual } from '@/lib/teams';

export function MatchHeadToHead({
  fixtureId,
  home,
  away,
  homeTeamId,
  awayTeamId,
  allMeetings,
  scope: initialScope = 'tournament',
  coverageLabel,
  teams,
}: {
  fixtureId: string;
  home: TeamVisual;
  away: TeamVisual;
  homeTeamId: string;
  awayTeamId: string;
  allMeetings: readonly Fixture[];
  scope?: H2hScope;
  coverageLabel?: string | null;
  teams: TeamDirectory;
}) {
  const [isHomeOnly, setIsHomeOnly] = useState(initialScope === 'home');

  const homeMeetings = allMeetings.filter((m) => m.home_team_id === homeTeamId);
  const activeMeetings = isHomeOnly ? homeMeetings : allMeetings;
  const currentRecord = headToHeadRecord(activeMeetings, homeTeamId, awayTeamId);

  const toggleHome = (e: React.MouseEvent) => {
    e.preventDefault();
    const next = !isHomeOnly;
    setIsHomeOnly(next);
    const nextUrl = next
      ? `/matches/${fixtureId}?tab=h2h&h2h=home`
      : `/matches/${fixtureId}?tab=h2h`;
    replacePath(nextUrl);
  };

  const tournamentHref = `/matches/${fixtureId}?tab=h2h`;
  const homeHref = `/matches/${fixtureId}?tab=h2h&h2h=home`;

  return (
    <section aria-labelledby="h2h-heading" className="match-panel match-panel--h2h">
      <h2 className="sr-only" id="h2h-heading">
        Head-to-head
      </h2>
      <div
        aria-label={`${home.label} ${currentRecord.homeWins} wins, ${currentRecord.draws} draws, ${away.label} ${currentRecord.awayWins} wins`}
        className="h2h-record"
        role="img"
      >
        <TeamBadge size="lg" visual={home} />
        <div className="h2h-record-stat">
          <strong style={{ background: home.color, color: home.textColor }}>
            {currentRecord.homeWins}
          </strong>
          <span>Wins</span>
        </div>
        <div className="h2h-record-stat">
          <strong className="h2h-record-draw">{currentRecord.draws}</strong>
          <span>Draws</span>
        </div>
        <div className="h2h-record-stat">
          <strong style={{ background: away.color, color: away.textColor }}>
            {currentRecord.awayWins}
          </strong>
          <span>Wins</span>
        </div>
        <TeamBadge size="lg" visual={away} />
      </div>
      <nav aria-label="Filter head-to-head meetings" className="h2h-filters">
        <Link
          aria-current={isHomeOnly ? 'true' : undefined}
          className="chip"
          href={isHomeOnly ? tournamentHref : homeHref}
          onClick={toggleHome}
          replace
        >
          <TeamBadge visual={home} />
          Home
        </Link>
        {coverageLabel ? <p className="h2h-note">Dating back to {coverageLabel}</p> : null}
      </nav>
      {allMeetings.length ? (
        <ol className="h2h-list">
          {allMeetings.map((meeting) => {
            const meetingHome = teamVisual(teams, meeting.home_team_id, meeting.home_team_name);
            const meetingAway = teamVisual(teams, meeting.away_team_id, meeting.away_team_name);
            const isCollapsed = isHomeOnly && meeting.home_team_id !== homeTeamId;
            return (
              <li
                aria-hidden={isCollapsed ? 'true' : undefined}
                className={`h2h-item ${isCollapsed ? 'h2h-item--collapsed' : ''}`}
                key={meeting.id}
              >
                <div className="h2h-item-inner">
                  <Link
                    className="h2h-meeting"
                    href={`/matches/${meeting.id}`}
                    tabIndex={isCollapsed ? -1 : undefined}
                  >
                    <span className="h2h-meeting-meta">
                      <LocalListDate value={meeting.kickoff_at} />
                    </span>
                    <span className="h2h-meeting-board">
                      <span className="h2h-meeting-team h2h-meeting-team--home">
                        {matchdayTeamLabel(meetingHome)}
                      </span>
                      <TeamBadge visual={meetingHome} />
                      <strong>
                        {meeting.home_score}–{meeting.away_score}
                      </strong>
                      <TeamBadge visual={meetingAway} />
                      <span className="h2h-meeting-team">{matchdayTeamLabel(meetingAway)}</span>
                    </span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="empty">No previous completed meetings are stored yet.</p>
      )}
      {isHomeOnly && allMeetings.length > 0 && homeMeetings.length === 0 ? (
        <p className="empty">No completed home meetings against this side are stored yet.</p>
      ) : null}
    </section>
  );
}
