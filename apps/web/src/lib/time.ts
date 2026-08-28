/** Instant formatting for a visitor timezone. Kickoffs remain UTC in storage and the API. */

export function visitorTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function kickoffClockParts(
  iso: string,
  timeZone: string,
): { clock: string; period?: string } {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone,
  }).formatToParts(new Date(iso));
  const period = parts.find((part) => part.type === 'dayPeriod')?.value;
  const clock = parts
    .filter((part) => part.type !== 'dayPeriod')
    .map((part) => part.value)
    .join('')
    .trim();
  return period ? { clock, period } : { clock };
}

export function kickoffFactLabel(
  iso: string,
  timeZone: string,
  nowIso = new Date().toISOString(),
): string {
  const includeYear =
    calendarDayKey(iso, timeZone).slice(0, 4) !== calendarDayKey(nowIso, timeZone).slice(0, 4);
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone,
  }).format(new Date(iso));
  const { clock, period } = kickoffClockParts(iso, timeZone);
  return period ? `${date}, ${clock} ${period}` : `${date}, ${clock}`;
}

export function kickoffDayLabel(iso: string, timeZone: string, includeYear = false): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
    timeZone,
  }).format(new Date(iso));
}

export function kickoffListDate(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  }).format(new Date(iso));
}

export function calendarDayKey(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}
