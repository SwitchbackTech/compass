import { useEffect, useState } from "react";
import { type GridEventShortcutTarget } from "@web/grid/shortcuts/focus-adjacent-grid-event";

/**
 * Tracks whether a grid event currently has DOM focus so the shortcut legend
 * can gate `when: { eventFocused: true }` rows. Reads `getFocused` after
 * focus settles (rAF) so moves between two events don't flash the legend off.
 */
export function useIsGridEventFocused(
  getFocused: () => GridEventShortcutTarget | null,
) {
  const [eventFocused, setEventFocused] = useState(() => getFocused() !== null);

  useEffect(() => {
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setEventFocused(getFocused() !== null);
      });
    };

    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    sync();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
    };
  }, [getFocused]);

  return eventFocused;
}
