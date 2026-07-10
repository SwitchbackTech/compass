import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  clampSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
} from "@web/components/PlannerSidebar/storage/sidebar-width.constants";

export function readSidebarWidth(): number {
  const stored = persistentBrowserStore.get(STORAGE_KEYS.SIDEBAR_WIDTH);
  if (stored === null) return SIDEBAR_DEFAULT_WIDTH;

  const width = Number(stored);
  return Number.isInteger(width)
    ? clampSidebarWidth(width)
    : SIDEBAR_DEFAULT_WIDTH;
}

export function writeSidebarWidth(width: number): void {
  persistentBrowserStore.set(STORAGE_KEYS.SIDEBAR_WIDTH, String(width));
}
