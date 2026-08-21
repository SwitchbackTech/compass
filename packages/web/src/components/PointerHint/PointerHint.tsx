import { type FC, useEffect, useState } from "react";
import { Z_INDEX_TOOLTIP } from "@web/common/constants/web.constants";
import {
  selectPointerBlockPulse,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";

const HINT_VISIBLE_MS = 2500;

/**
 * Teaches instead of silently ignoring: when a mouse click is blocked, a
 * transient pill explains that Compass is keyboard-only and points at the
 * legend. Mounted in RootShell so it shows with the sidebar closed too.
 * Top-center to stay clear of the Up Next banner's bottom-center spot.
 */
export const PointerHint: FC = () => {
  const pulse = usePointerBlockStore(selectPointerBlockPulse);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (pulse === 0) return;
    setIsVisible(true);
    const timer = window.setTimeout(() => setIsVisible(false), HINT_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (!isVisible) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-4 left-1/2 -translate-x-1/2 starting:translate-y-1 rounded-lg border border-border bg-surface-panel/90 px-3 py-1.5 text-sm text-text starting:opacity-0 shadow-xl backdrop-blur-md transition-all duration-200 ease-out motion-reduce:transition-none"
      data-pointer-hint=""
      role="status"
      style={{ zIndex: Z_INDEX_TOOLTIP }}
    >
      Compass is keyboard only. Press <kbd className="c-keycap">?</kbd> for
      shortcuts.
    </div>
  );
};
