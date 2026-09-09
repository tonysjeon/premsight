export function setFavorite<T extends { id: string }>(items: T[], item: T, saved: boolean): T[] {
  if (!saved) return items.filter((existing) => existing.id !== item.id);
  return items.some((existing) => existing.id === item.id) ? items : [...items, item];
}
