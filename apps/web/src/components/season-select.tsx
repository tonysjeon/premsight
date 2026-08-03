'use client';

import { useRouter } from 'next/navigation';
import type { Season } from '@/lib/api';

export function SeasonSelect({ seasons, value }: { seasons: Season[]; value: string }) {
  const router = useRouter();

  return (
    <label className="season-select">
      <span>Season</span>
      <select
        aria-label="Season"
        onChange={(event) => router.push(`/?season=${encodeURIComponent(event.target.value)}`)}
        value={value}
      >
        {seasons.map((season) => (
          <option key={season.id} value={season.id}>
            {season.name}
          </option>
        ))}
      </select>
    </label>
  );
}
