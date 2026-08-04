'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { Season } from '@/lib/api';

export function SeasonSelect({
  seasons,
  value,
  basePath = '/',
}: {
  seasons: Season[];
  value: string;
  basePath?: string;
}) {
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const selectedSeason = seasons.find((season) => season.id === value);

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
    <details className="season-select" ref={pickerRef}>
      <summary aria-label={`Season: ${selectedSeason?.name ?? 'Select season'}`}>
        <span>{selectedSeason?.name ?? 'Select season'}</span>
        <svg aria-hidden="true" viewBox="0 0 12 12">
          <path d="m3 4.5 3 3 3-3" />
        </svg>
      </summary>
      <div className="season-menu">
        {seasons.map((season) => (
          <Link
            aria-current={season.id === value ? 'page' : undefined}
            href={`${basePath}?season=${encodeURIComponent(season.id)}`}
            key={season.id}
          >
            {season.name}
          </Link>
        ))}
      </div>
    </details>
  );
}
