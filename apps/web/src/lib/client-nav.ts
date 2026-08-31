export function shouldSoftNavigate(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
}

export function replacePath(path: string): void {
  window.history.replaceState(window.history.state, '', path);
}

export function withReplacedParams(
  pathname: string,
  search: string,
  updates: Record<string, string | number | null | undefined>,
): string {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  for (const [name, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === '') params.delete(name);
    else params.set(name, String(value));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
