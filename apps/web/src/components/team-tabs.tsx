import Link from 'next/link';
import { SlidingTabs } from '@/components/sliding-tabs';
import type { TeamTab } from '@/lib/team-page';

const TABS: readonly { id: TeamTab; label: string }[] = [
  { id: 'fixtures', label: 'Fixtures' },
  { id: 'table', label: 'Table' },
  { id: 'roster', label: 'Roster' },
];

export function TeamTabs({ teamId, value }: { teamId: string; value: TeamTab }) {
  return (
    <SlidingTabs className="match-tabs" label="Team sections" selected={value}>
      {TABS.map((tab) => {
        const href = tab.id === 'fixtures' ? `/teams/${teamId}` : `/teams/${teamId}?tab=${tab.id}`;
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
    </SlidingTabs>
  );
}
