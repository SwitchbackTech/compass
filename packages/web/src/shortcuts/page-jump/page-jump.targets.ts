/**
 * Page-level jump targets for the hold-Mod hint gesture while no event form
 * is open: Mod+digit focuses a page area, and holding Mod alone reveals the
 * digits as chips (PageJumpHintOverlay) — the same contract as the form's
 * Mod+digit field jumps, so one habit covers both surfaces.
 *
 * Components opt in by spreading `pageJumpAttrs(id)` on their container;
 * digits come from this list's order, so it is the single place to add,
 * remove, or renumber a target. An unmounted anchor (collapsed sidebar,
 * empty Up Next) simply gets no chip and its digit does nothing. A closed
 * menu trigger (the view dropdown) is clicked after focus so the jump
 * reveals Day / Week / Life instead of landing on a closed heading.
 */

export const PAGE_JUMP_ATTRIBUTE = "data-page-jump";

export type PageJumpTargetId =
  | "view-select"
  | "month-picker"
  | "up-next"
  | "calendars"
  | "life-grid"
  | "life-variation"
  | "life-details";

export type PageJumpTarget = {
  digit: string;
  id: PageJumpTargetId;
  label: string;
};

export type PageJumpTargets = readonly PageJumpTarget[];

export const CALENDAR_PAGE_JUMP_TARGETS: PageJumpTargets = [
  { digit: "1", id: "view-select", label: "View dropdown" },
  { digit: "2", id: "month-picker", label: "Month picker" },
  { digit: "3", id: "up-next", label: "Up next" },
  { digit: "4", id: "calendars", label: "Calendar list" },
];

export const LIFE_PAGE_JUMP_TARGETS: PageJumpTargets = [
  { digit: "1", id: "view-select", label: "View dropdown" },
  { digit: "2", id: "life-grid", label: "Current week" },
  { digit: "3", id: "life-variation", label: "Life variation" },
  { digit: "4", id: "life-details", label: "Life details" },
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

const shouldOpenOnJump = (element: HTMLElement): boolean =>
  Boolean(element.getAttribute("aria-haspopup")) &&
  element.getAttribute("aria-expanded") !== "true";

/**
 * Focus a page jump target; returns whether a focusable element was found.
 * Menu/listbox triggers are clicked after focus so the dropdown opens —
 * that's what makes hold-Mod on the view switcher a discovery path for
 * Day / Week / Life, instead of landing on a closed heading.
 */
export const focusPageJumpTarget = (id: PageJumpTargetId): boolean => {
  const element = getPageJumpFocusElement(id);
  if (!element) return false;
  element.focus();
  if (shouldOpenOnJump(element)) {
    element.click();
  }
  return true;
};
