'use client';

import { useSyncExternalStore } from 'react';

import {
  kickoffClockParts,
  kickoffDayLabel,
  kickoffFactLabel,
  kickoffListDate,
  visitorTimeZone,
} from '@/lib/time';
import { kickoffCountdown } from '@/lib/match';

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function useHydrated() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}

export function KickoffTime({ value }: { value: string }) {
  const hydrated = useHydrated();
  const { clock, period } = kickoffClockParts(value, hydrated ? visitorTimeZone() : 'UTC');
  return (
    <time className="kickoff-time" dateTime={value}>
      <span>{clock}</span>
      {period ? <small>{period}</small> : null}
    </time>
  );
}

export function LocalKickoffFact({ value }: { value: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={value}>
      {kickoffFactLabel(value, hydrated ? visitorTimeZone() : 'UTC', hydrated ? undefined : value)}
    </time>
  );
}

export function LocalKickoffRelative({ value }: { value: string }) {
  const hydrated = useHydrated();
  const label = hydrated
    ? kickoffCountdown(value, new Date().toISOString(), visitorTimeZone())
    : null;
  return <span>{label ?? 'Kickoff'}</span>;
}

export function LocalDayLabel({ value, includeYear }: { value: string; includeYear?: boolean }) {
  const hydrated = useHydrated();
  return (
    <span>
      {kickoffDayLabel(
        value,
        hydrated ? visitorTimeZone() : 'UTC',
        includeYear,
        hydrated ? undefined : value,
      )}
    </span>
  );
}

export function LocalListDate({ value }: { value: string }) {
  const hydrated = useHydrated();
  return (
    <time dateTime={value}>{kickoffListDate(value, hydrated ? visitorTimeZone() : 'UTC')}</time>
  );
}
