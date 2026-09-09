export function setFavorite<T extends { id: string }>(items: T[], item: T, saved: boolean): T[] {
  if (!saved) return items.filter((existing) => existing.id !== item.id);
  return items.some((existing) => existing.id === item.id) ? items : [...items, item];
}

export async function persistFavorite(
  initial: boolean,
  desired: () => boolean,
  save: (value: boolean) => Promise<void>,
  confirmed: (value: boolean) => void,
) {
  let current = initial;
  while (desired() !== current) {
    const target = desired();
    await save(target);
    current = target;
    confirmed(current);
  }
}
