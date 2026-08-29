'use client';

import { useRouter } from 'next/navigation';

export function MatchBack() {
  const router = useRouter();

  return (
    <button
      aria-label="Back"
      className="match-back"
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }
        router.push('/');
      }}
    >
      <span className="match-back-icon" aria-hidden="true">
        <svg viewBox="0 0 16 16">
          <path d="m10 3.5-4.5 4.5 4.5 4.5" />
        </svg>
      </span>
      <span className="match-back-label">Back</span>
    </button>
  );
}
