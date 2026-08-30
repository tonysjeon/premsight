'use client';

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { measureActiveTabIndicator } from '@/lib/tab-indicator';

type SlidingTabsProps = {
  children: ReactNode;
  className: string;
  label: string;
  selected: string;
  as?: 'nav' | 'div';
  role?: 'tablist';
};

export function SlidingTabs({
  as = 'nav',
  children,
  className,
  label,
  role,
  selected,
}: SlidingTabsProps) {
  const listRef = useRef<HTMLElement | null>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const update = () => {
      const next = measureActiveTabIndicator(list);
      if (next) setIndicator(next);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      list.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [selected]);

  useEffect(() => {
    if (!indicator || ready) return;
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, [indicator, ready]);

  const indicatorClass = ready ? 'tab-indicator is-ready' : 'tab-indicator';
  const indicatorStyle = indicator
    ? { transform: `translate3d(${indicator.left}px, 0, 0)`, width: indicator.width }
    : undefined;
  const indicatorEl = indicator ? (
    <span aria-hidden="true" className={indicatorClass} style={indicatorStyle} />
  ) : null;

  if (as === 'div') {
    return (
      <div
        aria-label={label}
        className={className}
        ref={(node) => {
          listRef.current = node;
        }}
        role={role}
      >
        {children}
        {indicatorEl}
      </div>
    );
  }

  return (
    <nav
      aria-label={label}
      className={className}
      ref={(node) => {
        listRef.current = node;
      }}
    >
      {children}
      {indicatorEl}
    </nav>
  );
}
