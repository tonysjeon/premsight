import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import { SiteHeader } from '@/components/site-header';
import { loadCurrentSeason, loadSeasons } from '@/lib/football-load';
import { seasonPublicId } from '@/lib/public-id';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PremSight', template: '%s · PremSight' },
  description: 'Premier League fixtures, results and standings in one clear view.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const seasonNavigation = await Promise.all([loadCurrentSeason(), loadSeasons()])
    .then(([currentSeason, seasons]) => ({
      currentSeasonId: seasonPublicId(currentSeason),
      seasons,
    }))
    .catch(() => ({ currentSeasonId: null, seasons: [] }));

  return (
    <html data-theme="dark" lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('premsight-theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <SiteHeader {...seasonNavigation} />
        {children}
        <footer className="site-footer">
          <div className="shell">
            PremSight · Premier League intelligence ·{' '}
            <a href="https://www.football-data.org/" rel="noreferrer" target="_blank">
              Football data provided by the Football-Data.org API
            </a>
          </div>
        </footer>
      </body>
    </html>
  );
}
