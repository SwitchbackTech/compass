import { type KeyboardEvent } from "react";
import { keyboardKey } from "@web/shortcuts/is-bare-letter-key";

export const GATE_PANEL_CLASSNAME =
  "max-w-full gap-4 border border-border bg-surface text-center text-text shadow-xl";

/** Welcome-style letter bindings: unmodified keys, preventDefault, then run. */
export function handleOverlayLetterShortcut(
  event: KeyboardEvent,
  actions: Record<string, () => void>,
): void {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const action = actions[keyboardKey(event).toLowerCase()];
  if (!action) return;
  event.preventDefault();
  action();
}
