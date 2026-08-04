import type { Metadata } from 'next';
import '@fontsource-variable/manrope';
import { SiteHeader } from '@/components/site-header';
import { api } from '@/lib/api';
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
  const [currentSeason, seasons] = await Promise.all([api.currentSeason(), api.seasons()]);

  return (
    <html lang="en">
      <body>
        <SiteHeader currentSeasonId={currentSeason.id} seasons={seasons} />
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
