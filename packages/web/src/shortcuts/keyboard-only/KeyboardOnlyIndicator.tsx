import { type FC, useEffect, useState } from "react";
import {
  selectKeyboardOnlyActive,
  selectKeyboardOnlyPulse,
  useKeyboardOnlyStore,
} from "@web/shortcuts/keyboard-only/keyboard-only.store";

/**
 * Persistent badge while keyboard-only mode is on. Pulses when a click is
 * blocked so the user sees why the pointer did nothing.
 */
export const KeyboardOnlyIndicator: FC = () => {
  const isActive = useKeyboardOnlyStore(selectKeyboardOnlyActive);
  const pulse = useKeyboardOnlyStore(selectKeyboardOnlyPulse);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulse === 0) return;
    setIsPulsing(true);
    const timer = window.setTimeout(() => setIsPulsing(false), 220);
    return () => window.clearTimeout(timer);
  }, [pulse]);

  if (!isActive) return null;

  return (
    <span
      aria-live="polite"
      className={`c-sync-text-wave truncate text-xs ${isPulsing ? "font-semibold opacity-100" : "opacity-80"}`}
      data-keyboard-only-indicator=""
      role="status"
    >
      Keyboard only · Esc or Shift Shift
    </span>
  );
};
