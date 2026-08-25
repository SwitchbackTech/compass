/**
 * Page-level jump targets for the hold-Mod hint gesture while no event form
 * is open: Mod+digit focuses a page area, and holding Mod alone reveals the
 * digits as chips (PageJumpHintOverlay) — the same contract as the form's
 * Mod+digit field jumps, so one habit covers both surfaces.
 *
 * Components opt in by spreading `pageJumpAttrs(id)` on their container;
 * digits come from this list's order, so it is the single place to add,
 * remove, or renumber a target. An unmounted anchor (collapsed sidebar,
 * empty Up Next) simply gets no chip and its digit does nothing.
 */

export const PAGE_JUMP_ATTRIBUTE = "data-page-jump";

export type PageJumpTargetId =
  | "navigation"
  | "month-picker"
  | "up-next"
  | "calendars";

export type PageJumpTarget = {
  digit: string;
  id: PageJumpTargetId;
  label: string;
};

export const PAGE_JUMP_TARGETS: readonly PageJumpTarget[] = [
  { digit: "1", id: "navigation", label: "View navigation" },
  { digit: "2", id: "month-picker", label: "Month picker" },
  { digit: "3", id: "up-next", label: "Up next" },
  { digit: "4", id: "calendars", label: "Calendar list" },
];

/** Spread onto a component's container element to mark it as a jump target. */
export const pageJumpAttrs = (
  id: PageJumpTargetId,
): { [PAGE_JUMP_ATTRIBUTE]: PageJumpTargetId } => ({
  [PAGE_JUMP_ATTRIBUTE]: id,
});

export const getPageJumpAnchor = (id: PageJumpTargetId): HTMLElement | null =>
  document.querySelector<HTMLElement>(`[${PAGE_JUMP_ATTRIBUTE}="${id}"]`);

const INTERACTIVE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The element a jump would focus, or null if the target isn't currently
 * usable. An explicit `[tabindex="0"]` wins over document order so a roving
 * tab stop (the month picker keeps exactly one day at tabindex=0) is landed
 * on directly, and arrow keys / Tab work from there right away.
 */
export const getPageJumpFocusElement = (
  id: PageJumpTargetId,
): HTMLElement | null => {
  const anchor = getPageJumpAnchor(id);
  if (!anchor) return null;
  return (
    anchor.querySelector<HTMLElement>('[tabindex="0"]') ??
    (anchor.matches(INTERACTIVE_SELECTOR)
      ? anchor
      : anchor.querySelector<HTMLElement>(INTERACTIVE_SELECTOR))
  );
};

/** Focus a page jump target; returns whether a focusable element was found. */
export const focusPageJumpTarget = (id: PageJumpTargetId): boolean => {
  const element = getPageJumpFocusElement(id);
  if (!element) return false;
  element.focus();
  return true;
};
