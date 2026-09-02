import { useEffect } from "react";
import { getCalendarEventIdFromElement } from "@web/common/utils/event/event.util";
import { shouldStandDownBareLetterShortcut } from "@web/shortcuts/bare-letter-stand-down";
import { isBareLetterKey } from "@web/shortcuts/is-bare-letter-key";

export const EVENT_MENU_LETTER = "m";

/**
 * Bare `m` opens the focused event's context menu: it dispatches a synthetic
 * contextmenu event at the card, which ContextMenuWrapper already handles and
 * positions from the event coordinates. The menu itself is fully
 * keyboard-operable (floating-ui list navigation).
 *
 * Same capture-listener style and yields as the other bare letters (`s`, `f`):
 * stands down while app-locked, typing, an `e`… sequence is armed, or event
 * jump owns letters (`m` is the Monday jump key).
 */
export function useEventContextMenuShortcut() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!isBareLetterKey(event, EVENT_MENU_LETTER)) return;
      if (shouldStandDownBareLetterShortcut(event)) return;

      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return;
      if (!getCalendarEventIdFromElement(active)) return;

      event.preventDefault();
      event.stopPropagation();

      // Anchor near the card's top center so the menu reads as attached to
      // the event, like a right-click there would.
      const rect = active.getBoundingClientRect();
      active.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + Math.min(rect.height / 2, 24),
        }),
      );
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, []);
}
