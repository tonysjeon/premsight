const names = new Intl.DisplayNames(['en'], { type: 'region' });
const FOOTBALL_COUNTRIES: Record<string, string> = {
  EN: 'England',
  S1: 'Scotland',
  WA: 'Wales',
  NN: 'United Kingdom',
};

export function nationalityName(code: string | null): string {
  if (!code) return 'Unknown';
  const normalized = code.toUpperCase();
  if (FOOTBALL_COUNTRIES[normalized]) return FOOTBALL_COUNTRIES[normalized];
  if (!/^[A-Z]{2}$/.test(normalized)) return 'Unknown';
  return names.of(normalized) ?? 'Unknown';
}
