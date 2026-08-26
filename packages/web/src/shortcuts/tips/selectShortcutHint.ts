import {
  getShortcutHint,
  type ShortcutHint,
} from "@web/shortcuts/tips/shortcut-tips.data";

export type ShortcutHintContext = {
  isFormOpen: boolean;
  isLifeView: boolean;
  eventFocused: boolean;
  firstEventDone: boolean;
};

/**
 * First-match next-shortcut for the sidebar status bar. Mode indicators and
 * operational status (saving, delayed sync) are chosen by the bar itself.
 */
export function selectShortcutHint(ctx: ShortcutHintContext): ShortcutHint {
  if (ctx.isFormOpen && !ctx.firstEventDone) {
    return getShortcutHint("first-event-save");
  }
  if (ctx.isFormOpen) {
    return getShortcutHint("save-draft");
  }
  if (ctx.isLifeView) {
    return getShortcutHint("life-this-week");
  }
  if (ctx.eventFocused) {
    return getShortcutHint("edit-sequence");
  }
  if (!ctx.firstEventDone) {
    return getShortcutHint("create-event");
  }
  return getShortcutHint("page-jump");
}
