export type TeamTab = 'fixtures' | 'table' | 'roster';

const TABS = new Set<TeamTab>(['fixtures', 'table', 'roster']);

/** Accepts an untrusted query value and falls back to Fixtures. */
export function resolveTeamTab(requested: string | string[] | undefined): TeamTab {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  if (raw && TABS.has(raw as TeamTab)) return raw as TeamTab;
  return 'fixtures';
}
