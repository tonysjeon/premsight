export function pickerMenuScrollTop(
  activeOffsetTop: number,
  activeHeight: number,
  menuHeight: number,
): number {
  return Math.max(0, activeOffsetTop - (menuHeight - activeHeight) / 2);
}

function alignMenu(menu: HTMLElement) {
  const active = menu.querySelector<HTMLElement>('[aria-current="page"]');
  menu.scrollTop = active
    ? pickerMenuScrollTop(active.offsetTop, active.offsetHeight, menu.clientHeight)
    : 0;
}

/** Instantly place the current option in view so a picker never animates a scroll. */
export function syncPickerAlignment(picker: HTMLDetailsElement, menu: HTMLElement) {
  if (!picker.open) {
    picker.classList.remove('is-aligned');
    return;
  }

  alignMenu(menu);
  requestAnimationFrame(() => {
    if (!picker.open) return;
    alignMenu(menu);
    picker.classList.add('is-aligned');
  });
}
