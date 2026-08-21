import { useEffect } from "react";
import { isEditableKeyboardTarget } from "@web/common/utils/form/form.util";
import { isAppLocked } from "@web/shortcuts/app-lock";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";
import {
  findNextNoticeTarget,
  getVisibleNotices,
} from "@web/shortcuts/notice-focus/notice-focus";
import { isEventJumpActive } from "@web/shortcuts/shift-hint/event-jump.store";
import { isEditSequenceArmed } from "@web/shortcuts/useEditSequenceShortcut";

export const FOCUS_NOTICE_LETTER = "f";

/**
 * Bare `f` focuses the latest notice - an action toast or banner marked with
 * `data-notice` - so its buttons are reachable without a long Tab walk.
 * Repeat presses cycle through visible notices; Tab moves within one, Enter
 * activates, Escape dismisses toasts (useEscapeToDismissToast).
 *
 * Same capture-listener style and yields as the other bare letters (`s`, `h`):
 * stands down while app-locked, typing, an `e`… sequence is armed, or event
 * jump chips own letters (`f` is a jump key for Friday).
 */
export function useFocusNoticeShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!isBareLetterKey(event, FOCUS_NOTICE_LETTER)) return;
      if (isAppLocked() || isEditableKeyboardTarget(event)) return;
      if (isEditSequenceArmed()) return;
      if (isEventJumpActive()) return;

      const target = findNextNoticeTarget(
        getVisibleNotices(),
        document.activeElement,
      );
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      target.focus();
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
}
