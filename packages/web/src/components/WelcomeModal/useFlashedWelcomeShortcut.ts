import { useEffect, useState } from "react";
import {
  selectLatestPointerAttempt,
  selectPointerBlockPulse,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";

export const KEYCAP_FLASH_MS = 700;

/** The shortcut key currently flashing after a blocked click, or null. */
export function useFlashedWelcomeShortcut(): string | null {
  const pulse = usePointerBlockStore(selectPointerBlockPulse);
  const attempt = usePointerBlockStore(selectLatestPointerAttempt);
  const [flashedKey, setFlashedKey] = useState<string | null>(null);

  useEffect(() => {
    if (pulse === 0 || !attempt?.shortcutKey) return;
    setFlashedKey(attempt.shortcutKey);
    const timer = window.setTimeout(() => setFlashedKey(null), KEYCAP_FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [pulse, attempt?.shortcutKey]);

  return flashedKey;
}

export const flashedShortcutClass = (
  flashedKey: string | null,
  key: string,
): string =>
  flashedKey?.toLowerCase() === key.toLowerCase() ? "c-keycap-flash" : "";
