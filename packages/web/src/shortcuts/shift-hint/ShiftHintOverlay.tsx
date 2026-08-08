import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import { type ActiveShiftHint } from "@web/shortcuts/shift-hint/useShiftHoldEventHints";

/**
 * Fixed-position keycap chips anchored to visible event cards while SHIFT is
 * held. Portaled so overflow-hidden cards do not clip the hints.
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
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      {hints.map((hint) => {
        const rect = hint.element.getBoundingClientRect();
        // Skip off-screen cards instead of clamping chips into a corner pile.
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          rect.bottom <= 0 ||
          rect.right <= 0 ||
          rect.top >= window.innerHeight ||
          rect.left >= window.innerWidth
        ) {
          return null;
        }

        return (
          <span
            key={`${hint.eventId}:${hint.hint}`}
            className="absolute"
            style={{ top: rect.top + 4, left: rect.right - 22 }}
          >
            <ShortcutHint>{hint.hint.toUpperCase()}</ShortcutHint>
          </span>
        );
      })}
    </div>,
    document.body,
  );
}
