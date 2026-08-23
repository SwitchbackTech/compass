import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { getVisibleHintRect } from "@web/shortcuts/shift-hint/shift-hint-visible-rect";
import { type ActiveShiftHint } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";

/**
 * Fixed-position keycap chips anchored to event cards while event-jump mode
 * is on. Portaled so overflow-hidden cards do not clip the hints.
 */
export function ShiftHintOverlay({ hints }: { hints: ActiveShiftHint[] }) {
  const [, setLayoutTick] = useState(0);

  useEffect(() => {
    if (hints.length === 0) return;

    const refresh = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("resize", refresh);
    // Capture scroll from nested grid scrollers.
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [hints.length]);

  if (hints.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      data-shift-event-hints=""
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      {hints.map((hint) => {
        const visible = getVisibleHintRect(hint.element);
        // Skip cards clipped by the window or a grid scroller so chips do
        // not pile up on the header when the event is scrolled out of view.
        if (!visible) {
          return null;
        }

        const label = hint.hint.toUpperCase();
        // Longer labels (SU1, F10) need more room than the old AA chips.
        const chipWidth = Math.max(22, 10 + label.length * 8);

        return (
          <span
            key={`${hint.eventId}:${hint.hint}`}
            className="absolute"
            style={{
              top: visible.top + 4,
              left: Math.max(4, visible.right - chipWidth),
            }}
          >
            <ShortcutHint>{label}</ShortcutHint>
          </span>
        );
      })}
    </div>,
    document.body,
  );
}
