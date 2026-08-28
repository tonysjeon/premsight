'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import type { Season } from '@/lib/api';
import { syncPickerAlignment } from '@/lib/picker-menu';

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
  const menuRef = useRef<HTMLDivElement>(null);
  const selectedSeason = seasons.find((season) => season.id === value);

  useEffect(() => {
    const picker = pickerRef.current;
    const menu = menuRef.current;
    if (!picker || !menu) return;

    const closePicker = () => {
      picker.open = false;
    };
    const align = () => syncPickerAlignment(picker, menu);
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !picker.contains(event.target)) closePicker();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || !picker.open) return;
      closePicker();
      picker.querySelector('summary')?.focus();
    };

    picker.addEventListener('toggle', align);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      picker.removeEventListener('toggle', align);
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
      <div className="season-menu" ref={menuRef}>
        {seasons.map((season) => {
          const current = season.id === value;
          return (
            <Link
              aria-current={current ? 'page' : undefined}
              href={`${basePath}?season=${encodeURIComponent(season.id)}`}
              key={season.id}
            >
              <span aria-hidden="true" className="selection-check">
                {current ? (
                  <svg viewBox="0 0 16 16">
                    <path d="m3.5 8.5 3 3 6-7" />
                  </svg>
                ) : null}
              </span>
              <span className="selection-option">
                <span>{season.name}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
