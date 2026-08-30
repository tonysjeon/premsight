export type ProfileTab = 'teams' | 'players';

export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`;
  return letters.toUpperCase() || '?';
}
