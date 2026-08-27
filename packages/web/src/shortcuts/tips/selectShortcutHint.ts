import {
  getShortcutHint,
  type ShortcutHint,
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

function pickFromPool(
  pool: readonly ShortcutHintId[],
  demonstratedIds: readonly ShortcutHintId[],
): ShortcutHintId {
  const unused = pool.find((id) => !demonstratedIds.includes(id));
  if (unused) return unused;

  const lastUsedId = demonstratedIds[demonstratedIds.length - 1];
  const lastIndex = lastUsedId ? pool.indexOf(lastUsedId) : -1;
  return pool[(lastIndex + 1) % pool.length];
}

/**
 * Next-shortcut for the sidebar status bar. First-event create/save stay
 * sticky; afterwards the pick is the first undemonstrated id in a context
 * pool ordered by Shortcut Showcase levels, then a rotation once the pool
 * is exhausted. Mode indicators and operational status are chosen by the
 * bar itself.
 */
export function selectShortcutHint(
  ctx: ShortcutHintContext,
  demonstratedIds: readonly ShortcutHintId[] = [],
): ShortcutHint {
  const pick = (pool: readonly ShortcutHintId[]) =>
    getShortcutHint(pickFromPool(pool, demonstratedIds));

  if (ctx.isFormOpen && !ctx.firstEventDone) {
    return getShortcutHint("first-event-save");
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
    return getShortcutHint("create-event");
  }
  return pick(withWeekDayFocus(IDLE_POOL, ctx.isWeekView));
}
