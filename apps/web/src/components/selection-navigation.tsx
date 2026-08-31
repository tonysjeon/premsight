'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { TeamBadge } from '@/components/team-badge';
import { shouldSoftNavigate } from '@/lib/client-nav';
import { syncPickerAlignment } from '@/lib/picker-menu';
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
  heading,
  headingId,
  itemLabel,
  options,
  showArrows = true,
  showPicker = true,
  value,
  onSelect,
}: {
  ariaLabel: string;
  emptyLabel: string;
  heading?: string;
  headingId?: string;
  itemLabel: string;
  options: readonly SelectionOption[];
  showArrows?: boolean;
  showPicker?: boolean;
  value: string | null;
  onSelect?: (option: SelectionOption) => void;
}) {
  const router = useRouter();
  const pickerRef = useRef<HTMLDetailsElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const index = value === null ? -1 : options.findIndex((option) => option.value === value);
  const selected = index < 0 ? null : options[index];
  const label = heading ?? selected?.label ?? emptyLabel;

  const go = (option: SelectionOption | undefined) => {
    if (!option) return;
    const picker = pickerRef.current;
    if (picker) picker.open = false;
    if (onSelect) {
      onSelect(option);
      return;
    }
    router.push(option.href);
  };

  useEffect(() => {
    const picker = pickerRef.current;
    const menu = menuRef.current;
    if (!showPicker || !picker || !menu) return;

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
  }, [showPicker]);

  return (
    <nav
      aria-label={ariaLabel}
      className={
        showArrows ? 'matchday-navigation' : 'matchday-navigation matchday-navigation--picker-only'
      }
    >
      {showArrows ? (
        <button
          aria-label={`Previous ${itemLabel}`}
          disabled={index <= 0}
          onClick={() => go(options[index - 1])}
          type="button"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16">
            <path d="m10 3.5-4.5 4.5 4.5 4.5" />
          </svg>
        </button>
      ) : null}
      {showPicker ? (
        <details className="matchday-picker" ref={pickerRef}>
          <summary>
            <span className="selection-option">
              {selected?.badge ? <TeamBadge visual={selected.badge} /> : null}
              <span>{label}</span>
            </span>
            <svg aria-hidden="true" viewBox="0 0 12 12">
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </summary>
          <div className="matchday-menu" ref={menuRef}>
            {options.map((option) => {
              const current = option.value === value;
              return (
                <Link
                  aria-current={current ? 'page' : undefined}
                  href={option.href}
                  key={option.value}
                  onClick={(event) => {
                    if (!shouldSoftNavigate(event)) return;
                    event.preventDefault();
                    go(option);
                  }}
                >
                  <span aria-hidden="true" className="selection-check">
                    {current ? (
                      <svg viewBox="0 0 16 16">
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    ) : null}
                  </span>
                  <span className="selection-option">
                    {option.badge ? <TeamBadge visual={option.badge} /> : null}
                    <span>{option.label}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </details>
      ) : (
        <h2 className="matchday-heading" id={headingId}>
          {label}
        </h2>
      )}
      {showArrows ? (
        <button
          aria-label={`Next ${itemLabel}`}
          disabled={index < 0 || index >= options.length - 1}
          onClick={() => go(options[index + 1])}
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
