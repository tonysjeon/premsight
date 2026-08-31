export default function Loading() {
  return (
    <main className="shell home-page">
      <div aria-busy="true" aria-live="polite" className="page-loading">
        <span className="sr-only">Loading</span>
      </div>
    </main>
  );
}
