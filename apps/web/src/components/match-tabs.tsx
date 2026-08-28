import Link from 'next/link';
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
}: {
  fixtureId: string;
  value: MatchTab;
  hasPreview?: boolean;
}) {
  const tabs = hasPreview ? ALL_TABS : ALL_TABS.filter((tab) => tab.id !== 'preview');
  return (
    <nav aria-label="Match sections" className="match-tabs">
      {tabs.map((tab) => {
        const href =
          tab.id === 'preview' ? `/matches/${fixtureId}` : `/matches/${fixtureId}?tab=${tab.id}`;
        return (
          <Link
            aria-current={tab.id === value ? 'page' : undefined}
            href={href}
            key={tab.id}
            replace
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
