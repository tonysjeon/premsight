import { SelectionNavigation } from '@/components/selection-navigation';
import { roundOptionLabel } from '@/lib/season';

export function MatchdayNavigation({
  matchdays,
  seasonId,
  seasonName,
  isCurrentSeason = true,
  value,
  basePath = '/',
}: {
  matchdays: readonly number[];
  seasonId: string;
  seasonName?: string;
  isCurrentSeason?: boolean;
  value: number | null;
  basePath?: string;
}) {
  return (
    <SelectionNavigation
      ariaLabel="Select round"
      emptyLabel="Matches"
      itemLabel="round"
      options={matchdays.map((matchday) => ({
        value: String(matchday),
        label: roundOptionLabel(matchday, seasonName, isCurrentSeason),
        href: `${basePath}?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`,
      }))}
      value={value === null ? null : String(value)}
    />
  );
}
