'use client';

import Link from 'next/link';
import { SlidingTabs } from '@/components/sliding-tabs';
import { replacePath, shouldSoftNavigate } from '@/lib/client-nav';
import type { MatchTab } from '@/lib/match';

const ALL_TABS: readonly { id: MatchTab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'table', label: 'Table' },
  { id: 'h2h', label: 'Head-to-Head' },
];

export function MatchTabs({
  fixtureId,
  value,
  hasPreview = true,
  onSelect,
}: {
  fixtureId: string;
  value: MatchTab;
  hasPreview?: boolean;
  onSelect?: (tab: MatchTab) => void;
}) {
  const tabs = hasPreview ? ALL_TABS : ALL_TABS.filter((tab) => tab.id !== 'preview');
  return (
    <SlidingTabs className="match-tabs" label="Match sections" selected={value}>
      {tabs.map((tab) => {
        const href =
          tab.id === 'preview' ? `/matches/${fixtureId}` : `/matches/${fixtureId}?tab=${tab.id}`;
        return (
          <Link
            aria-current={tab.id === value ? 'page' : undefined}
            href={href}
            key={tab.id}
            onClick={(event) => {
              if (!onSelect || !shouldSoftNavigate(event)) return;
              event.preventDefault();
              onSelect(tab.id);
              replacePath(href);
            }}
            replace
          >
            {tab.label}
          </Link>
        );
      })}
    </SlidingTabs>
  );
}
