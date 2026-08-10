import {
  filterShortcutsByContext,
  getShortcutsBySection,
} from "@web/shortcuts/shortcuts.registry";
import { type ShortcutOverlaySection } from "@web/shortcuts/shortcuts-overlay.types";

export type ShortcutMenuView = "day" | "week" | "life";

interface ShortcutMenuConfig {
  view: ShortcutMenuView;
  /** Day: viewing today. Week: viewing the current week. Drives the "t" label. */
  isViewingCurrentPeriod: boolean;
  eventFocused?: boolean;
  isFormOpen?: boolean;
}

/**
 * Get shortcut menu sections for the overlay. Uses the shortcut registry
 * to filter and organize shortcuts based on the current view and state.
 */
export const getShortcutMenuSections = (
  config: ShortcutMenuConfig,
): ShortcutOverlaySection[] => {
  const { view, isViewingCurrentPeriod, eventFocused, isFormOpen } = config;

  const filteredShortcuts = filterShortcutsByContext({
    view,
    isViewingCurrentPeriod,
    eventFocused,
    isFormOpen,
  });

  return getShortcutsBySection(filteredShortcuts);
};
