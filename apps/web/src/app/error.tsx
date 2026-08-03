'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="shell page">
      <p className="eyebrow">Data unavailable</p>
      <h1>We lost the match feed.</h1>
      <p className="page-lede">The data service could not answer this request.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
