import { type FC } from "react";
import { ShortcutHint } from "@web/components/Shortcuts/ShortcutHint";

/**
 * Sandbox-only command palette for the showcase palette level. The real
 * palette stays locked behind the takeover's app-lock; this overlay teaches
 * Mod+K without navigating the live app.
 */
export const PracticePalette: FC<{
  onRun: () => void;
}> = ({ onRun }) => {
  return (
    <div
      role="dialog"
      aria-label="Practice command palette"
      className="absolute inset-x-4 top-8 z-10 rounded-xl border border-border bg-surface-raised p-3 shadow-xl"
    >
      <p className="mb-2 text-text-muted text-xs">Command palette</p>
      <button
        type="button"
        className="c-focus-ring flex w-full items-center justify-between gap-2 rounded-md bg-surface-overlay px-3 py-2 text-left text-sm text-text"
        onClick={onRun}
      >
        Focus Team sync
        <ShortcutHint className="shrink-0">Enter</ShortcutHint>
      </button>
    </div>
  );
};
