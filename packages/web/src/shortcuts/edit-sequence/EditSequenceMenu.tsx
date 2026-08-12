import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";
import {
  selectEditSequenceMenuVisible,
  useEditSequenceStore,
} from "@web/shortcuts/edit-sequence/edit-sequence.store";
import { EDIT_SEQUENCE_OPTIONS } from "@web/shortcuts/useEditSequenceShortcut";

const MENU_WIDTH = 232;
/**
 * First-paint estimate only. The real height depends on the option count and
 * the user's font size, so it is measured after mount and fed back in: a stale
 * constant would place a flipped menu on top of the event it points at.
 */
const ESTIMATED_MENU_HEIGHT = 148;
const GAP = 8;

/** Screen-reader copy, so the visible chips can stay aria-hidden. */
const SR_TEXT = `Edit which field? ${EDIT_SEQUENCE_OPTIONS.map(
  (option) => `${option.key.toUpperCase()} for ${option.label.toLowerCase()}`,
).join(", ")}. Escape to cancel.`;

type MenuPosition = { top: number; left: number };

const centeredFallback = (menuHeight: number): MenuPosition => ({
  top: Math.max(GAP, window.innerHeight - menuHeight - GAP * 4),
  left: Math.max(GAP, (window.innerWidth - MENU_WIDTH) / 2),
});

/**
 * Places the menu just below the anchor, flipping above when it would run off
 * the bottom, and clamping horizontally. Falls back to the lower middle of the
 * viewport when the anchor is gone or scrolled out of sight.
 *
 * Takes the menu's measured height rather than assuming one, so the flipped
 * placement always clears the anchor.
 */
export const resolveMenuPosition = (
  anchor: HTMLElement | null,
  menuHeight: number = ESTIMATED_MENU_HEIGHT,
): MenuPosition => {
  if (!anchor) return centeredFallback(menuHeight);

  const rect = anchor.getBoundingClientRect();
  const isOffscreen =
    rect.width === 0 ||
    rect.height === 0 ||
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= window.innerHeight ||
    rect.left >= window.innerWidth;
  if (isOffscreen) return centeredFallback(menuHeight);

  const below = rect.bottom + GAP;
  const fitsBelow = below + menuHeight <= window.innerHeight - GAP;
  const top = fitsBelow ? below : Math.max(GAP, rect.top - menuHeight - GAP);

  const left = Math.min(
    Math.max(GAP, rect.left),
    Math.max(GAP, window.innerWidth - MENU_WIDTH - GAP),
  );

  return { top, left };
};

/**
 * The which-key panel for the `e` / `Mod+E` edit leader. Portaled like
 * ShiftHintOverlay so overflow-hidden event cards cannot clip it.
 */
export function EditSequenceMenu({
  getAnchor,
}: {
  getAnchor: () => HTMLElement | null;
}) {
  const isVisible = useEditSequenceStore(selectEditSequenceMenuVisible);
  const [, setLayoutTick] = useState(0);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [menuHeight, setMenuHeight] = useState(ESTIMATED_MENU_HEIGHT);

  useEffect(() => {
    if (!isVisible) return;

    const refresh = () => setLayoutTick((tick) => tick + 1);
    window.addEventListener("resize", refresh);
    // Capture scroll from nested grid scrollers.
    window.addEventListener("scroll", refresh, true);
    return () => {
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [isVisible]);

  // Layout effect, not effect: this corrects the estimate before paint, so the
  // menu never visibly jumps from the guessed position to the measured one.
  useLayoutEffect(() => {
    const measured = panelRef.current?.offsetHeight;
    if (measured && measured !== menuHeight) {
      setMenuHeight(measured);
    }
  });

  if (!isVisible || typeof document === "undefined") {
    return null;
  }

  const { top, left } = resolveMenuPosition(getAnchor(), menuHeight);

  return createPortal(
    <div
      className="pointer-events-none fixed"
      data-edit-sequence-menu=""
      style={{ top, left, width: MENU_WIDTH, zIndex: Z_INDEX_TOOLTIP }}
    >
      <div
        ref={panelRef}
        aria-live="polite"
        // Opaque surface-raised, matching c-context-menu/c-tooltip: this floats
        // over the grid, and surface-overlay is a 7% tint meant to sit on top
        // of an already-opaque panel, so events showed through it.
        className="rounded border border-border bg-surface-raised p-2 shadow-[0_4px_6px_var(--color-shadow-default)]"
        role="status"
      >
        <span className="sr-only">{SR_TEXT}</span>
        <div aria-hidden className="flex flex-col gap-1">
          <span className="px-0.5 text-text-muted text-xs">
            Edit which field?
          </span>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {EDIT_SEQUENCE_OPTIONS.map((option) => (
              <span
                key={option.key}
                className="flex items-center gap-1.5 text-text text-xs"
              >
                <ShortcutHint>{option.key.toUpperCase()}</ShortcutHint>
                <span className="truncate">{option.label}</span>
              </span>
            ))}
          </div>
          <span className="px-0.5 text-text-muted text-xs">Esc to cancel</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
