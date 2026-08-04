import { SelectionNavigation } from '@/components/selection-navigation';

export function MatchdayNavigation({
  matchdays,
  seasonId,
  value,
  basePath = '/',
}: {
  matchdays: readonly number[];
  seasonId: string;
  value: number | null;
  basePath?: string;
}) {
  return (
    <SelectionNavigation
      ariaLabel="Select matchday"
      emptyLabel="Matches"
      itemLabel="matchday"
      options={matchdays.map((matchday) => ({
        value: String(matchday),
        label: `Matchday ${matchday}`,
        href: `${basePath}?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`,
      }))}
      value={value === null ? null : String(value)}
    />
  );
}
