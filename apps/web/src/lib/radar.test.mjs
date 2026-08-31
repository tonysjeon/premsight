import assert from 'node:assert/strict';
import test from 'node:test';
import {
  radarAxisAngle,
  radarGridCircles,
  radarGridPolygons,
  radarOverlapPercents,
  radarPoint,
  radarPolygonPoints,
} from './radar.ts';

test('radarAxisAngle starts at 12 o clock (-PI/2)', () => {
  assert.equal(radarAxisAngle(0, 6), -Math.PI / 2);
  assert.equal(radarAxisAngle(3, 6), Math.PI / 2);
});

test('radarPoint computes correct coordinates with clamping', () => {
  const topPoint = radarPoint(100, 100, 80, 100, 0, 4);
  assert.equal(topPoint.x, 100);
  assert.equal(topPoint.y, 20);

  const centerPoint = radarPoint(100, 100, 80, 0, 0, 4);
  assert.equal(centerPoint.x, 100);
  assert.equal(centerPoint.y, 100);

  const clampedPoint = radarPoint(100, 100, 80, 150, 0, 4);
  assert.equal(clampedPoint.y, 20);
});

test('radarPolygonPoints creates valid SVG point string', () => {
  const points = radarPolygonPoints(100, 100, 50, [100, 100, 100, 100]);
  assert.equal(typeof points, 'string');
  assert.equal(points.split(' ').length, 4);
});

test('radarGridPolygons generates concentric rings', () => {
  const rings = radarGridPolygons(100, 100, 80, 6, 4);
  assert.equal(rings.length, 4);
});

test('radarGridCircles generates concentric radii', () => {
  assert.deepEqual(radarGridCircles(80, 4), [20, 40, 60, 80]);
});

test('radarOverlapPercents takes the min of each axis', () => {
  assert.deepEqual(radarOverlapPercents([80, 40, 90], [50, 70, 20]), [50, 40, 20]);
  assert.deepEqual(radarOverlapPercents([10], [8, 9]), [8]);
});
