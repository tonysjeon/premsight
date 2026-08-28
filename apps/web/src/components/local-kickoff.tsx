'use client';

import {
  kickoffClockParts,
  kickoffDayLabel,
  kickoffFactLabel,
  kickoffListDate,
  visitorTimeZone,
} from '@/lib/time';
import { kickoffCountdown } from '@/lib/match';

export function KickoffTime({ value }: { value: string }) {
  const { clock, period } = kickoffClockParts(value, visitorTimeZone());
  return (
    <time className="kickoff-time" dateTime={value} suppressHydrationWarning>
      <span>{clock}</span>
      {period ? <small>{period}</small> : null}
    </time>
  );
}

export function LocalKickoffFact({ value }: { value: string }) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {kickoffFactLabel(value, visitorTimeZone())}
    </time>
  );
}

export function LocalKickoffRelative({ value }: { value: string }) {
  const label = kickoffCountdown(value, new Date().toISOString(), visitorTimeZone());
  return <span suppressHydrationWarning>{label ?? 'Kickoff'}</span>;
}

export function LocalDayLabel({ value, includeYear }: { value: string; includeYear?: boolean }) {
  return (
    <span suppressHydrationWarning>{kickoffDayLabel(value, visitorTimeZone(), includeYear)}</span>
  );
}

export function LocalListDate({ value }: { value: string }) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {kickoffListDate(value, visitorTimeZone())}
    </time>
  );
}
