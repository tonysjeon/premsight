'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { SeasonSelect } from '@/components/season-select';
import { SettingsMenu } from '@/components/settings-menu';
import { SlidingTabs } from '@/components/sliding-tabs';
import type { Season } from '@/lib/api';
import { seasonMatches, seasonPublicId } from '@/lib/public-id';

const SEASON_ROUTES = ['/', '/fixtures', '/table'];

function BrandLink({ href }: { href: string }) {
  return (
    <Link className="brand" href={href}>
      <Image alt="" className="brand-mark" height={22} src="/icon.svg" unoptimized width={22} />
      <span className="brand-word">
        PREM<span>SIGHT</span>
      </span>
    </Link>
  );
}

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
  const matchedSeason = requestedSeasonId
    ? seasons.find((season) => seasonMatches(season, requestedSeasonId))
    : undefined;
  const selectedSeason =
    matchedSeason ??
    seasons.find((season) => seasonMatches(season, currentSeasonId ?? '')) ??
    seasons.find((season) => season.id === currentSeasonId);
  const seasonId = selectedSeason ? seasonPublicId(selectedSeason) : currentSeasonId;
  const selectPath = SEASON_ROUTES.includes(pathname) ? pathname : '/';
  const href = (path: string) =>
    seasonId ? `${path}?season=${encodeURIComponent(seasonId)}` : path;
  const hideSeasonNav =
    pathname === '/draft' ||
    pathname === '/profile' ||
    pathname.startsWith('/matches/') ||
    pathname.startsWith('/teams/');
  const isHome = SEASON_ROUTES.includes(pathname);
  const leagueName = selectedSeason?.competition_name ?? 'Premier League';

  return (
    <>
      <header className="site-header">
        <div className="site-brand-bar">
          <div className="shell home-page site-brand-row">
            <BrandLink href={href('/')} />
            <div className="site-header-actions">
              <Link
                aria-current={isHome ? 'page' : undefined}
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
          <SlidingTabs className="nav-tabs" label="Primary" selected={pathname}>
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
          </SlidingTabs>
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
  const selectedSeason =
    seasons.find((season) => seasonMatches(season, currentSeasonId ?? '')) ??
    seasons.find((season) => season.id === currentSeasonId);
  const seasonId = selectedSeason ? seasonPublicId(selectedSeason) : currentSeasonId;
  const href = (path: string) =>
    seasonId ? `${path}?season=${encodeURIComponent(seasonId)}` : path;
  const leagueName = selectedSeason?.competition_name ?? 'Premier League';

  return (
    <>
      <header className="site-header">
        <div className="site-brand-bar">
          <div className="shell home-page site-brand-row">
            <BrandLink href={href('/')} />
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
