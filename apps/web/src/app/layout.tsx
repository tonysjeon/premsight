import type { Metadata } from 'next';
import Link from 'next/link';
import '@fontsource-variable/manrope';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'PremSight', template: '%s · PremSight' },
  description: 'Premier League fixtures, results and standings in one clear view.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="shell">
            <Link className="brand" href="/">
              PREM<span>SIGHT</span>
            </Link>
            <nav aria-label="Primary" className="nav-tabs">
              <Link href="/">Matches</Link>
              <Link href="/fixtures">Fixtures</Link>
              <Link href="/table">Table</Link>
            </nav>
          </div>
        </header>
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
