import Link from 'next/link';
import type { Fixture } from '@/lib/api';
import { recentTeamForm, type TeamFormMatch } from '@/lib/season';
import { matchdayTeamLabel, teamVisual, type TeamDirectory, type TeamVisual } from '@/lib/teams';

const RESULT_LABEL = { W: 'won', D: 'drew', L: 'lost' } as const;

export function MatchTeamForm({
  home,
  away,
  homeTeamId,
  awayTeamId,
  fixtures,
  excludeFixtureId,
  teams,
}: {
  home: TeamVisual;
  away: TeamVisual;
  homeTeamId: string;
  awayTeamId: string;
  fixtures: readonly Fixture[];
  excludeFixtureId: string;
  teams: TeamDirectory;
}) {
  const homeForm = recentTeamForm(fixtures, homeTeamId, 5, excludeFixtureId);
  const awayForm = recentTeamForm(fixtures, awayTeamId, 5, excludeFixtureId);
  if (!homeForm.length && !awayForm.length) return null;

  return (
    <div className="prediction-section team-form">
      <h3 className="prediction-section-title prediction-section-title--center">Team form</h3>
      <div className="team-form-grid">
        <TeamFormColumn entries={homeForm} team={home} teams={teams} />
        <TeamFormColumn entries={awayForm} team={away} teams={teams} />
      </div>
    </div>
  );
}

function TeamFormColumn({
  team,
  entries,
  teams,
}: {
  team: TeamVisual;
  entries: readonly TeamFormMatch[];
  teams: TeamDirectory;
}) {
  if (!entries.length) {
    return (
      <p className="team-form-empty">{team.label} has no completed league matches this season.</p>
    );
  }
  return (
    <ul className="team-form-list">
      {entries.map((entry, index) => {
        const { fixture, result, isHome } = entry;
        const homeSide = teamVisual(teams, fixture.home_team_id, fixture.home_team_name);
        const awaySide = teamVisual(teams, fixture.away_team_id, fixture.away_team_name);
        const homeName = matchdayTeamLabel(homeSide);
        const awayName = matchdayTeamLabel(awaySide);
        const resultWord = RESULT_LABEL[result];
        return (
          <li key={fixture.id}>
            <Link
              aria-label={`${team.label} ${resultWord} ${fixture.home_score}-${fixture.away_score} ${isHome ? 'against' : 'at'} ${isHome ? awayName : homeName}`}
              className="team-form-row"
              href={`/matches/${fixture.id}`}
            >
              <span className="team-form-name team-form-name--home">{homeName}</span>
              <span
                className={`team-form-score team-form-score--${result.toLowerCase()}${index === 0 ? ' team-form-score--latest' : ''}`}
              >
                <span className="team-form-goals">{fixture.home_score}</span>
                <span aria-hidden="true" className="team-form-score-sep">
                  -
                </span>
                <span className="team-form-goals">{fixture.away_score}</span>
              </span>
              <span className="team-form-name">{awayName}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
