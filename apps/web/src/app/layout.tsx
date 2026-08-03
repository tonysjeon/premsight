import type { Metadata } from 'next';
import Link from 'next/link';
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
          <div className="wrap nav">
            <Link className="brand" href="/">
              PREM<span>SIGHT</span>
            </Link>
            <nav aria-label="Primary">
              <Link href="/">Home</Link>
              <Link href="/fixtures">Fixtures</Link>
              <Link href="/table">Table</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer>
          <div className="wrap">PremSight · Premier League intelligence</div>
        </footer>
      </body>
    </html>
  );
}
