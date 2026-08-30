export function tabIndicatorPosition(
  listLeft: number,
  scrollLeft: number,
  tabLeft: number,
  tabWidth: number,
): { left: number; width: number } {
  return { left: tabLeft - listLeft + scrollLeft, width: tabWidth };
}

export function measureActiveTabIndicator(
  list: HTMLElement,
): { left: number; width: number } | null {
  const selected = list.querySelector<HTMLElement>(
    ':scope > [aria-current="page"], :scope > [aria-selected="true"]',
  );
  if (!selected) return null;
  const listBox = list.getBoundingClientRect();
  const tabBox = selected.getBoundingClientRect();
  return tabIndicatorPosition(listBox.left, list.scrollLeft, tabBox.left, tabBox.width);
}
