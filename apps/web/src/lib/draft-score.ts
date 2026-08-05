export type DraftOutcome =
  | 'Centurions'
  | 'Champions'
  | '2nd Place'
  | '3rd Place'
  | '4th Place'
  | 'Mid Table'
  | 'Survive Relegation'
  | 'Relegation';

export type DraftScore = {
  projectedPoints: number;
  outcome: DraftOutcome;
  starterAverage: number;
  benchAverage: number;
  weightedRating: number;
};

type DraftScoreInput = {
  starters: readonly number[];
  bench: readonly number[];
  reserves?: readonly number[];
};

const STARTER_COUNT = 11;
const BENCH_COUNT = 7;
const STARTER_WEIGHT = 0.85;
const BENCH_WEIGHT = 0.15;
const BASE_RATING = 70;
const POINTS_PER_RATING = 80 / 15;

function average(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function validRatings(values: readonly number[]): boolean {
  return values.every((rating) => Number.isFinite(rating) && rating >= 1 && rating <= 99);
}

export function classifyProjectedPoints(points: number): DraftOutcome {
  if (points === 100) return 'Centurions';
  if (points >= 90) return 'Champions';
  if (points >= 84) return '2nd Place';
  if (points >= 78) return '3rd Place';
  if (points >= 72) return '4th Place';
  if (points >= 52) return 'Mid Table';
  if (points >= 36) return 'Survive Relegation';
  return 'Relegation';
}

export function scoreDraft({ starters, bench }: DraftScoreInput): DraftScore | null {
  if (
    starters.length !== STARTER_COUNT ||
    bench.length !== BENCH_COUNT ||
    !validRatings(starters) ||
    !validRatings(bench)
  ) {
    return null;
  }

  const starterAverage = average(starters);
  const benchAverage = average(bench);
  const weightedRating = starterAverage * STARTER_WEIGHT + benchAverage * BENCH_WEIGHT;
  const projectedPoints = Math.max(
    0,
    Math.min(100, Math.round(20 + (weightedRating - BASE_RATING) * POINTS_PER_RATING)),
  );

  return {
    projectedPoints,
    outcome: classifyProjectedPoints(projectedPoints),
    starterAverage,
    benchAverage,
    weightedRating,
  };
}
