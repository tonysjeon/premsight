import Link from 'next/link';
import type { ReactNode } from 'react';

type CardProps = {
  title?: string;
  note?: string;
  action?: { href: string; label: string };
  /** Removes body padding so rows and tables can meet the card edges. */
  flush?: boolean;
  children: ReactNode;
};

export function Card({ title, note, action, flush = false, children }: CardProps) {
  return (
    <section className="card">
      {title ? (
        <header className="card-head">
          <h2 className="card-title">
            {title}
            {note ? <span className="card-note">{note}</span> : null}
          </h2>
          {action ? (
            <Link className="card-link" href={action.href}>
              {action.label}
            </Link>
          ) : null}
        </header>
      ) : null}
      {flush ? children : <div className="card-body">{children}</div>}
    </section>
  );
}
