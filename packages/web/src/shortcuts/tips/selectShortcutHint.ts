import { rankShortcutHints } from "@web/shortcuts/tips/rankShortcutHints";
import { type ShortcutUsageProfile } from "@web/shortcuts/tips/shortcut-personalization.storage";
import {
  getShortcutHint,
  type RankedShortcutHint,
  type ShortcutHintId,
} from "@web/shortcuts/tips/shortcut-tips.data";

export type ShortcutHintContext = {
  isFormOpen: boolean;
  isLifeView: boolean;
  isWeekView?: boolean;
  eventFocused: boolean;
  firstEventDone: boolean;
};

const IDLE_POOL = [
  "page-jump",
  "event-jump",
  "command-palette",
  "create-event",
] as const satisfies readonly ShortcutHintId[];

const FOCUSED_POOL = [
  "edit-sequence",
  "nudge",
  "edge-focus",
  ...IDLE_POOL,
] as const satisfies readonly ShortcutHintId[];

/** Week view inserts the column-letter tip after event-jump. */
function withWeekDayFocus(
  pool: readonly ShortcutHintId[],
  isWeekView?: boolean,
): readonly ShortcutHintId[] {
  if (!isWeekView) return pool;
  const insertAt = pool.indexOf("event-jump") + 1;
  return [
    ...pool.slice(0, insertAt),
    "week-day-focus",
    ...pool.slice(insertAt),
  ];
}

const FORM_POOL = [
  "save-draft",
  "command-palette",
] as const satisfies readonly ShortcutHintId[];

const LIFE_POOL = [
  "life-this-week",
  "command-palette",
] as const satisfies readonly ShortcutHintId[];

const EMPTY_USAGE_PROFILE: ShortcutUsageProfile = { version: 1, actions: {} };

function ranked(
  id: ShortcutHintId,
  reasonCode = getShortcutHint(id).suggestionReason,
): RankedShortcutHint {
  return { ...getShortcutHint(id), reasonCode };
}

/**
 * Next-shortcut for the sidebar status bar. First-event create/save stay
 * sticky; afterwards rankShortcutHints scores the context pool (untried
 * actions, recency, fatigue) and uses the deterministic showcase order as
 * the tie-breaker. Mode indicators and operational status are chosen by
 * the bar itself.
 */
export function selectShortcutHint(
  ctx: ShortcutHintContext,
  demonstratedIds: readonly ShortcutHintId[] = [],
  profile: ShortcutUsageProfile = EMPTY_USAGE_PROFILE,
  now = Date.now(),
): RankedShortcutHint {
  const pick = (pool: readonly ShortcutHintId[]) =>
    rankShortcutHints(pool, demonstratedIds, profile, now);

  if (ctx.isFormOpen && !ctx.firstEventDone) {
    return ranked("first-event-save");
  }
  if (ctx.isFormOpen) {
    return pick(FORM_POOL);
  }
  if (ctx.isLifeView) {
    return pick(LIFE_POOL);
  }
  if (ctx.eventFocused) {
    return pick(withWeekDayFocus(FOCUSED_POOL, ctx.isWeekView));
  }
  if (!ctx.firstEventDone) {
    return ranked("create-event", "first_event");
  }
  return pick(withWeekDayFocus(IDLE_POOL, ctx.isWeekView));
}
