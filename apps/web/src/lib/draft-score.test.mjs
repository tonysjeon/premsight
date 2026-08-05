import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyProjectedPoints, scoreDraft } from './draft-score.ts';

test('weights the starting XI much more heavily than the bench', () => {
  const strongStarters = scoreDraft({
    starters: Array(11).fill(80),
    bench: Array(7).fill(70),
  });
  const strongBench = scoreDraft({
    starters: Array(11).fill(70),
    bench: Array(7).fill(80),
  });

  assert.equal(strongStarters?.weightedRating, 78.5);
  assert.equal(strongBench?.weightedRating, 71.5);
  assert.ok(strongStarters.projectedPoints > strongBench.projectedPoints);
});

test('ignores reserve ratings', () => {
  const lowReserves = scoreDraft({
    starters: Array(11).fill(80),
    bench: Array(7).fill(80),
    reserves: Array(5).fill(1),
  });
  const highReserves = scoreDraft({
    starters: Array(11).fill(80),
    bench: Array(7).fill(80),
    reserves: Array(5).fill(99),
  });

  assert.deepEqual(lowReserves, highReserves);
});

test('returns null until the scoring squad is complete', () => {
  assert.equal(scoreDraft({ starters: Array(10).fill(80), bench: Array(7).fill(80) }), null);
  assert.equal(scoreDraft({ starters: Array(11).fill(80), bench: Array(6).fill(80) }), null);
});

test('clamps projected points to the zero-to-100 range', () => {
  assert.equal(
    scoreDraft({ starters: Array(11).fill(99), bench: Array(7).fill(99) })?.projectedPoints,
    100,
  );
  assert.equal(
    scoreDraft({ starters: Array(11).fill(1), bench: Array(7).fill(1) })?.projectedPoints,
    0,
  );
});

test('classifies every league-result boundary', () => {
  const cases = [
    [100, 'Centurions'],
    [99, 'Champions'],
    [90, 'Champions'],
    [89, '2nd Place'],
    [84, '2nd Place'],
    [83, '3rd Place'],
    [78, '3rd Place'],
    [77, '4th Place'],
    [72, '4th Place'],
    [71, 'Mid Table'],
    [52, 'Mid Table'],
    [51, 'Survive Relegation'],
    [36, 'Survive Relegation'],
    [35, 'Relegation'],
  ];

  for (const [points, outcome] of cases) {
    assert.equal(classifyProjectedPoints(points), outcome);
  }
});
