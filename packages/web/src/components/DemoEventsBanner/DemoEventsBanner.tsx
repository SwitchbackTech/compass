import { type FC } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

export function hasDismissedDemoEventsBanner(): boolean {
  if (!persistentBrowserStore.isAvailable()) return true;
  return (
    persistentBrowserStore.get(
      STORAGE_KEYS.HAS_DISMISSED_DEMO_EVENTS_BANNER,
    ) === "true"
  );
}

export function dismissDemoEventsBanner(): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.HAS_DISMISSED_DEMO_EVENTS_BANNER,
    "true",
  );
}

interface DemoEventsBannerProps {
  onDismiss: () => void;
}

export const DemoEventsBanner: FC<DemoEventsBannerProps> = ({ onDismiss }) => (
  <div
    className="flex items-center justify-between gap-3 border-border border-b bg-surface-panel px-4 py-2 text-text-muted text-xs"
    role="status"
  >
    <span>
      Sample events to help you explore. Edit or clear from the cmd palette.
    </span>
    <button
      className="c-focus-ring shrink-0 rounded-xs px-2 py-1 text-text hover:bg-surface-overlay"
      onClick={onDismiss}
      type="button"
    >
      Dismiss
    </button>
  </div>
);
