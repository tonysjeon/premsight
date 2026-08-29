'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SeasonSelect } from '@/components/season-select';
import { SettingsMenu } from '@/components/settings-menu';
import type { Season } from '@/lib/api';

const SEASON_ROUTES = ['/', '/fixtures', '/table'];

function SiteHeaderContent({
  currentSeasonId,
  seasons,
}: {
  currentSeasonId: string | null;
  seasons: Season[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requestedSeasonId = searchParams.get('season');
  const seasonId = seasons.some((season) => season.id === requestedSeasonId)
    ? requestedSeasonId!
    : currentSeasonId;
  const selectPath = SEASON_ROUTES.includes(pathname) ? pathname : '/';
  const href = (path: string) =>
    seasonId ? `${path}?season=${encodeURIComponent(seasonId)}` : path;
  const hideSeasonNav =
    pathname === '/draft' || pathname.startsWith('/matches/') || pathname.startsWith('/teams/');
  const leagueName =
    seasons.find((item) => item.id === seasonId)?.competition_name ?? 'Premier League';

  return (
    <>
      <header className="site-header">
        <div className="site-brand-bar">
          <div className="shell home-page site-brand-row">
            <Link className="brand" href={href('/')}>
              PREM<span>SIGHT</span>
            </Link>
            <div className="site-header-actions">
              <Link
                aria-current={pathname === '/' ? 'page' : undefined}
                className="header-nav-link"
                href={href('/')}
              >
                Home
              </Link>
              <Link
                aria-current={pathname === '/draft' ? 'page' : undefined}
                className="header-nav-link"
                href="/draft"
              >
                Draft
              </Link>
              <SettingsMenu />
            </div>
          </div>
        </div>
      </header>
      {hideSeasonNav ? null : (
        <div className="shell home-page site-header-card">
          <div className="site-header-league">
            <div className="site-header-league-identity">
              <span aria-hidden="true" className="match-round-mark site-header-league-mark" />
              <div className="site-header-league-copy">
                <p className="site-header-league-name">{leagueName}</p>
                <p className="site-header-league-country">England</p>
              </div>
            </div>
            {seasonId ? (
              <div className="site-header-season">
                <span aria-hidden="true" className="site-header-season-label">
                  Season
                </span>
                <SeasonSelect basePath={selectPath} seasons={seasons} value={seasonId} />
              </div>
            ) : null}
          </div>
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
          </nav>
        </div>
      )}
    </>
  );
}

function SiteHeaderFallback({
  currentSeasonId,
  seasons,
}: {
  currentSeasonId: string | null;
  seasons: Season[];
}) {
  const seasonId = currentSeasonId;
  const href = (path: string) =>
    seasonId ? `${path}?season=${encodeURIComponent(seasonId)}` : path;
  const leagueName =
    seasons.find((item) => item.id === seasonId)?.competition_name ?? 'Premier League';

  return (
    <>
      <header className="site-header">
        <div className="site-brand-bar">
          <div className="shell home-page site-brand-row">
            <Link className="brand" href={href('/')}>
              PREM<span>SIGHT</span>
            </Link>
            <div className="site-header-actions">
              <Link className="header-nav-link" href={href('/')}>
                Home
              </Link>
              <Link className="header-nav-link" href="/draft">
                Draft
              </Link>
              <SettingsMenu />
            </div>
          </div>
        </div>
      </header>
      <div className="shell home-page site-header-card">
        <div className="site-header-league">
          <div className="site-header-league-identity">
            <span aria-hidden="true" className="match-round-mark site-header-league-mark" />
            <div className="site-header-league-copy">
              <p className="site-header-league-name">{leagueName}</p>
              <p className="site-header-league-country">England</p>
            </div>
          </div>
          {seasonId ? (
            <div className="site-header-season">
              <span aria-hidden="true" className="site-header-season-label">
                Season
              </span>
              <SeasonSelect basePath="/" seasons={seasons} value={seasonId} />
            </div>
          ) : null}
        </div>
        <nav aria-label="Primary" className="nav-tabs">
          <Link href={href('/')}>Overview</Link>
          <Link href={href('/table')}>Table</Link>
          <Link href={href('/fixtures')}>Fixtures</Link>
        </nav>
      </div>
    </>
  );
}

export function SiteHeader(props: { currentSeasonId: string | null; seasons: Season[] }) {
  return (
    <Suspense fallback={<SiteHeaderFallback {...props} />}>
      <SiteHeaderContent {...props} />
    </Suspense>
  );
}
