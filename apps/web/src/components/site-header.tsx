'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SeasonSelect } from '@/components/season-select';
import type { Season } from '@/lib/api';

const SEASON_ROUTES = ['/', '/fixtures', '/table'];

export function SiteHeader({
  currentSeasonId,
  seasons,
}: {
  currentSeasonId: string;
  seasons: Season[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSeasonId = searchParams.get('season');
  const seasonId = seasons.some((season) => season.id === requestedSeasonId)
    ? requestedSeasonId!
    : currentSeasonId;
  const selectPath = SEASON_ROUTES.includes(pathname) ? pathname : '/';
  const href = (path: string) => `${path}?season=${encodeURIComponent(seasonId)}`;

  return (
    <header className="site-header">
      <div className="site-brand-bar">
        <div className="shell home-page">
          <Link className="brand" href={href('/')}>
            PREM<span>SIGHT</span>
          </Link>
        </div>
      </div>
      <div className="shell home-page site-header-card">
        <nav aria-label="Primary" className="nav-tabs">
          <Link aria-current={pathname === '/' ? 'page' : undefined} href={href('/')}>
            Overview
          </Link>
          <Link aria-current={pathname === '/table' ? 'page' : undefined} href={href('/table')}>
            Table
          </Link>
          <Link
            aria-current={pathname === '/fixtures' ? 'page' : undefined}
            href={href('/fixtures')}
          >
            Fixtures
          </Link>
          <Link aria-current={pathname === '/draft' ? 'page' : undefined} href="/draft">
            Draft
          </Link>
        </nav>
        <SeasonSelect basePath={selectPath} seasons={seasons} value={seasonId} />
      </div>
    </header>
  );
}
