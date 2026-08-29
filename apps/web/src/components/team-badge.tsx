import type { TeamVisual } from '@/lib/teams';
import Image from 'next/image';

type BadgeSize = 'sm' | 'lg' | 'hero';

const BADGE_PX: Record<BadgeSize, number> = { sm: 22, lg: 42, hero: 64 };

/** Decorative club mark; the adjacent team name carries the meaning. */
export function TeamBadge({
  visual,
  large = false,
  size,
}: {
  visual: TeamVisual;
  large?: boolean;
  size?: BadgeSize;
}) {
  const resolved = size ?? (large ? 'lg' : 'sm');
  const pixels = BADGE_PX[resolved];
  const crestClass =
    resolved === 'hero' ? 'crest crest--hero' : resolved === 'lg' ? 'crest crest--lg' : 'crest';
  if (visual.crestUrl) {
    return (
      <span className={`${crestClass} crest--image`}>
        <Image
          alt=""
          decoding="async"
          height={pixels}
          loading="eager"
          src={visual.crestUrl}
          unoptimized
          width={pixels}
        />
      </span>
    );
  }
  return (
    <span
      className={crestClass}
      style={{ background: visual.color, color: visual.textColor }}
      aria-hidden="true"
    >
      {visual.abbr}
    </span>
  );
}
