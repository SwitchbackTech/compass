import { type CalendarCardIdentity } from "@web/calendars/useCalendarLookup";
import { readability } from "@web/common/styles/color.utils";

/**
 * The accent fill for a card's identity strip: this calendar's color, or a
 * top-to-bottom two-stop gradient into the other account's color when the
 * card is standing in for a cross-account duplicate (A5). Shared by
 * TimedEventCard and AllDayEventCard so the gradient direction/shape can't
 * drift between the two.
 */
export function calendarAccentStyle(identity: CalendarCardIdentity): {
  backgroundColor?: string;
  backgroundImage?: string;
} {
  if (identity.otherAccount) {
    return {
      backgroundImage: `linear-gradient(to bottom, ${identity.backgroundColor}, ${identity.otherAccount.backgroundColor})`,
    };
  }
  return { backgroundColor: identity.backgroundColor };
}

/**
 * The accessible-label suffix for a card's calendar identity, naming the
 * other account when this card is a cross-account duplicate merge - the
 * gradient accent is otherwise the only visual sign a second copy exists, and
 * accent color alone is never how identity is conveyed (A9).
 */
export function calendarAccentAccessibleSuffix(
  identity: CalendarCardIdentity,
): string {
  const calendarSuffix = `, ${identity.name} calendar`;
  return identity.otherAccount
    ? `${calendarSuffix}, also on ${identity.otherAccount.accountEmail}`
    : calendarSuffix;
}

// Light-theme page paper (`--background` under `.theme-light-beach`). Calendar
// colors that fail 3:1 here (local #fff, pale pastels) vanish as outside focus
// chrome on light mode.
const LIGHT_PAGE_PAPER = "#f3eee2";
const MIN_FOCUS_CONTRAST = 3;

/**
 * CSS color for event focus chrome. Falls back to `--text` when no calendar
 * color is available, or when that color is too light to read against the
 * page (same family as the selected ring) so cards never introduce a third
 * theme-accent color and never lose a visible focus indicator.
 */
export function eventFocusColor(focusColor: string | null | undefined): string {
  if (!focusColor) return "var(--text)";
  if (readability(focusColor, LIGHT_PAGE_PAPER) < MIN_FOCUS_CONTRAST) {
    return "var(--text)";
  }
  return focusColor;
}

/**
 * Whole-card focus outline classes. Suppressed while an edge is focused so
 * only the outer edge line shows (short titles stay readable).
 */
export function eventFocusOutlineClass(
  focusedEdge: "startDate" | "endDate" | null,
): string {
  return focusedEdge
    ? "focus-visible:outline-none"
    : "focus-visible:outline-(--event-focus-color) focus-visible:outline-2 focus-visible:outline-offset-2";
}

/**
 * Outer box-shadow line for start/end edge focus. Drawn outside the card so
 * short-event titles stay readable (unlike an inset accent bar).
 */
export function eventEdgeFocusShadow(
  edge: "startDate" | "endDate",
  axis: "horizontal" | "vertical",
  color: string,
): string {
  if (axis === "vertical") {
    // Timed cards: start = top, end = bottom.
    return edge === "startDate" ? `0 -3px 0 0 ${color}` : `0 3px 0 0 ${color}`;
  }
  // All-day cards: start = left, end = right.
  return edge === "startDate" ? `-3px 0 0 0 ${color}` : `3px 0 0 0 ${color}`;
}
