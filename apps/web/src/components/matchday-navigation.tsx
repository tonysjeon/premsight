'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

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
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const index = value === null ? -1 : matchdays.indexOf(value);
  const goTo = (matchday: number) =>
    router.push(`/?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`);

  useEffect(() => {
    const closePicker = () => {
      if (pickerRef.current) pickerRef.current.open = false;
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) closePicker();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !pickerRef.current?.open) return;
      closePicker();
      pickerRef.current.querySelector('summary')?.focus();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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
      <details className="matchday-picker" ref={pickerRef}>
        <summary>
          <span>{value === null ? 'Matches' : `Matchday ${value}`}</span>
          <svg viewBox="0 0 12 12">
            <path d="m3 4.5 3 3 3-3" />
          </svg>
        </summary>
        <div className="matchday-menu">
          {matchdays.map((matchday) => (
            <Link
              aria-current={matchday === value ? 'page' : undefined}
              href={`/?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`}
              key={matchday}
            >
              Matchday {matchday}
            </Link>
          ))}
        </div>
      </details>
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
