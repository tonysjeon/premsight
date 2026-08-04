'use client';

import { useRouter } from 'next/navigation';

export function MatchdayNavigation({
  matchdays,
  seasonId,
  value,
}: {
  matchdays: readonly number[];
  seasonId: string;
  value: number | null;
}) {
  const router = useRouter();
  const index = value === null ? -1 : matchdays.indexOf(value);
  const goTo = (matchday: number) =>
    router.push(`/?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`);

  return (
    <nav aria-label="Select matchday" className="matchday-navigation">
      <button
        aria-label="Previous matchday"
        disabled={index <= 0}
        onClick={() => goTo(matchdays[index - 1]!)}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="m10 3.5-4.5 4.5 4.5 4.5" />
        </svg>
      </button>
      <label className="matchday-picker">
        <span aria-hidden="true" className="matchday-picker-value">
          {value === null ? 'Matches' : `Matchday ${value}`}
          <svg viewBox="0 0 12 12">
            <path d="m3 4.5 3 3 3-3" />
          </svg>
        </span>
        <select
          aria-label="Matchday"
          disabled={value === null}
          onChange={(event) => goTo(Number(event.target.value))}
          value={value ?? ''}
        >
          {value === null ? <option value="">Matches</option> : null}
          {matchdays.map((matchday) => (
            <option key={matchday} value={matchday}>
              Matchday {matchday}
            </option>
          ))}
        </select>
      </label>
      <button
        aria-label="Next matchday"
        disabled={index < 0 || index >= matchdays.length - 1}
        onClick={() => goTo(matchdays[index + 1]!)}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16">
          <path d="m6 3.5 4.5 4.5-4.5 4.5" />
        </svg>
      </button>
    </nav>
  );
}
