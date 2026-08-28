import { MatchTeamForm } from '@/components/match-team-form';
import { TeamBadge } from '@/components/team-badge';
import type { Fixture, Prediction } from '@/lib/api';
import type { TeamDirectory, TeamVisual } from '@/lib/teams';

export function MatchPrediction({
  home,
  away,
  homeTeamId,
  awayTeamId,
  prediction,
  fixtures,
  excludeFixtureId,
  teams,
}: {
  home: TeamVisual;
  away: TeamVisual;
  homeTeamId: string;
  awayTeamId: string;
  prediction: Prediction | null;
  fixtures: readonly Fixture[];
  excludeFixtureId: string;
  teams: TeamDirectory;
}) {
  if (!prediction) {
    return (
      <section
        aria-labelledby="match-prediction-heading"
        className="match-panel match-panel--prediction"
      >
        <h2 className="sr-only" id="match-prediction-heading">
          Match prediction
        </h2>
        <p className="empty">
          An estimate is not ready for this fixture. This can happen when a team lacks completed
          league history or the prediction service is temporarily unavailable.
        </p>
        <MatchTeamForm
          away={away}
          awayTeamId={awayTeamId}
          excludeFixtureId={excludeFixtureId}
          fixtures={fixtures}
          home={home}
          homeTeamId={homeTeamId}
          teams={teams}
        />
      </section>
    );
  }

  const homeWinPct = Math.round(prediction.outcomes.home_win * 100);
  const drawPct = Math.round(prediction.outcomes.draw * 100);
  const awayWinPct = Math.round(prediction.outcomes.away_win * 100);

  return (
    <section
      aria-labelledby="match-prediction-heading"
      className="match-panel match-panel--prediction"
    >
      <h2 className="sr-only" id="match-prediction-heading">
        Match prediction
      </h2>

      <div
        aria-label={`${home.label} ${homeWinPct}% win probability, Draw ${drawPct}%, ${away.label} ${awayWinPct}% win probability`}
        className="h2h-record"
        role="img"
      >
        <TeamBadge size="lg" visual={home} />
        <div className="h2h-record-stat">
          <strong style={{ background: home.color, color: home.textColor }}>{homeWinPct}%</strong>
          <span>Win</span>
        </div>
        <div className="h2h-record-stat">
          <strong className="h2h-record-draw">{drawPct}%</strong>
          <span>Draw</span>
        </div>
        <div className="h2h-record-stat">
          <strong style={{ background: away.color, color: away.textColor }}>{awayWinPct}%</strong>
          <span>Win</span>
        </div>
        <TeamBadge size="lg" visual={away} />
      </div>

      <div className="prediction-bar-container">
        <div className="outcome-bar">
          <span
            className="outcome-bar-home"
            style={{ flexGrow: prediction.outcomes.home_win, background: home.color }}
          />
          <span
            className="outcome-bar-draw"
            style={{ flexGrow: prediction.outcomes.draw, background: '#454545' }}
          />
          <span
            className="outcome-bar-away"
            style={{ flexGrow: prediction.outcomes.away_win, background: away.color }}
          />
        </div>
      </div>

      <MatchTeamForm
        away={away}
        awayTeamId={awayTeamId}
        excludeFixtureId={excludeFixtureId}
        fixtures={fixtures}
        home={home}
        homeTeamId={homeTeamId}
        teams={teams}
      />

      <footer className="prediction-footer">
        <span className="match-model-version">Model {prediction.model_version}</span>
      </footer>
    </section>
  );
}
