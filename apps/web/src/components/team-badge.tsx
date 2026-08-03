import type { TeamVisual } from '@/lib/teams';
import Image from 'next/image';

/** Decorative club mark; the adjacent team name carries the meaning. */
export function TeamBadge({ visual, large = false }: { visual: TeamVisual; large?: boolean }) {
  if (visual.crestUrl) {
    const size = large ? 42 : 22;
    return (
      <span className={large ? 'crest crest--lg crest--image' : 'crest crest--image'}>
        <Image alt="" height={size} src={visual.crestUrl} unoptimized width={size} />
      </span>
    );
  }
  return (
    <span
      className={large ? 'crest crest--lg' : 'crest'}
      style={{ background: visual.color, color: visual.textColor }}
      aria-hidden="true"
    >
      {visual.abbr}
    </span>
  );
}
