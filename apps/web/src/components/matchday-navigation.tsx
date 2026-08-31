import { SelectionNavigation } from '@/components/selection-navigation';
import { roundOptionLabel } from '@/lib/season';

export function MatchdayNavigation({
  matchdays,
  seasonId,
  seasonName,
  isCurrentSeason = true,
  value,
  basePath = '/',
  onSelect,
}: {
  matchdays: readonly number[];
  seasonId: string;
  seasonName?: string;
  isCurrentSeason?: boolean;
  value: number | null;
  basePath?: string;
  onSelect?: (matchday: number, href: string) => void;
}) {
  return (
    <SelectionNavigation
      ariaLabel="Select round"
      emptyLabel="Matches"
      itemLabel="round"
      onSelect={onSelect ? (option) => onSelect(Number(option.value), option.href) : undefined}
      options={matchdays.map((matchday) => ({
        value: String(matchday),
        label: roundOptionLabel(matchday, seasonName, isCurrentSeason),
        href: `${basePath}?season=${encodeURIComponent(seasonId)}&matchday=${matchday}`,
      }))}
      value={value === null ? null : String(value)}
    />
  );
}
