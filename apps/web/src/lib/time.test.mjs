import assert from 'node:assert/strict';
import test from 'node:test';
import { kickoffClockParts, kickoffDayLabel, kickoffFactLabel, kickoffListDate } from './time.ts';

const KICKOFF = '2026-08-29T18:30:00Z';

test('formats a kickoff clock in the visitor timezone', () => {
  assert.deepEqual(kickoffClockParts(KICKOFF, 'UTC'), { clock: '6:30', period: 'PM' });
  assert.deepEqual(kickoffClockParts(KICKOFF, 'America/Los_Angeles'), {
    clock: '11:30',
    period: 'AM',
  });
});

test('formats the local calendar day for a kickoff', () => {
  assert.equal(kickoffDayLabel(KICKOFF, 'UTC'), 'Saturday, August 29');
  assert.equal(kickoffDayLabel(KICKOFF, 'America/Los_Angeles'), 'Saturday, August 29');
  assert.equal(kickoffDayLabel('2026-08-30T02:00:00Z', 'America/Los_Angeles'), 'Saturday, August 29');
  assert.equal(kickoffDayLabel(KICKOFF, 'UTC', true), 'Saturday, August 29, 2026');
});

test('formats a compact local date and time for match facts', () => {
  assert.equal(kickoffFactLabel(KICKOFF, 'UTC', '2026-08-01T00:00:00Z'), 'Sat, August 29, 6:30 PM');
  assert.equal(
    kickoffFactLabel(KICKOFF, 'America/Los_Angeles', '2026-08-01T00:00:00Z'),
    'Sat, August 29, 11:30 AM',
  );
  assert.equal(
    kickoffFactLabel(KICKOFF, 'UTC', '2025-12-01T00:00:00Z'),
    'Sat, August 29, 2026, 6:30 PM',
  );
  assert.equal(
    kickoffFactLabel('2027-01-15T15:00:00Z', 'UTC', '2026-08-28T12:00:00Z'),
    'Fri, January 15, 2027, 3:00 PM',
  );
});

test('formats a list date with month, day, and year', () => {
  assert.equal(kickoffListDate(KICKOFF, 'UTC'), 'August 29, 2026');
  assert.equal(kickoffListDate('2026-08-30T02:00:00Z', 'America/Los_Angeles'), 'August 29, 2026');
});
