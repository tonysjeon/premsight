'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { TeamBadge } from '@/components/team-badge';
import type { TeamVisual } from '@/lib/teams';

export type SelectionOption = {
  value: string;
  label: string;
  href: string;
  badge?: TeamVisual;
};

export function SelectionNavigation({
  ariaLabel,
  emptyLabel,
  itemLabel,
  options,
  showArrows = true,
  value,
}: {
  ariaLabel: string;
  emptyLabel: string;
  itemLabel: string;
  options: readonly SelectionOption[];
  showArrows?: boolean;
  value: string | null;
}) {
  const router = useRouter();
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const index = value === null ? -1 : options.findIndex((option) => option.value === value);
  const selected = index < 0 ? null : options[index];

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
    <nav
      aria-label={ariaLabel}
      className={showArrows ? 'matchday-navigation' : 'matchday-navigation matchday-navigation--picker-only'}
    >
      {showArrows ? (
        <button
          aria-label={`Previous ${itemLabel}`}
          disabled={index <= 0}
          onClick={() => router.push(options[index - 1]!.href)}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="m10 3.5-4.5 4.5 4.5 4.5" />
          </svg>
        </button>
      ) : null}
      <details className="matchday-picker" ref={pickerRef}>
        <summary>
          <span className="selection-option">
            {selected?.badge ? <TeamBadge visual={selected.badge} /> : null}
            <span>{selected?.label ?? emptyLabel}</span>
          </span>
          <svg aria-hidden="true" viewBox="0 0 12 12">
            <path d="m3 4.5 3 3 3-3" />
          </svg>
        </summary>
        <div className="matchday-menu">
          {options.map((option) => (
            <Link
              aria-current={option.value === value ? 'page' : undefined}
              href={option.href}
              key={option.value}
            >
              <span className="selection-option">
                {option.badge ? <TeamBadge visual={option.badge} /> : null}
                <span>{option.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </details>
      {showArrows ? (
        <button
          aria-label={`Next ${itemLabel}`}
          disabled={index < 0 || index >= options.length - 1}
          onClick={() => router.push(options[index + 1]!.href)}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="m6 3.5 4.5 4.5-4.5 4.5" />
          </svg>
        </button>
      ) : null}
    </nav>
  );
}
