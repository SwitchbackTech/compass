import dayjs from "@core/util/date/dayjs";
import {
  SHORTCUTS,
  type ShortcutDef,
  type ShortcutTag,
  ShortcutTags,
} from "@web/common/shortcuts/shortcut.registry";
import { type Shortcut } from "@web/common/types/global.shortcut.types";

interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  isNow?: boolean;
  currentDate?: dayjs.Dayjs;
}

/**
 * Derives a flat Shortcut list from all registry entries that carry the given tag.
 * Use this for groups where the registry label is correct as-is (no per-view override needed).
 */
function byTag(tag: ShortcutTag): Shortcut[] {
  return (Object.values(SHORTCUTS) as ShortcutDef[])
    .filter((def) => def.tags.includes(tag))
    .map((def) => ({ k: def.display, label: def.label }));
}

export const getShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, isNow = false, currentDate } = config;

  // Global shortcuts are fully derived from the registry — adding a new GLOBAL
  // shortcut to shortcut.registry.ts will automatically surface it here.
  const globalShortcuts: Shortcut[] = byTag(ShortcutTags.GLOBAL);

  let homeShortcuts: Shortcut[] = [];
  let dayShortcuts: Shortcut[] = [];
  let dayTaskShortcuts: Shortcut[] = [];
  let dayAgendaShortcuts: Shortcut[] = [];
  let nowShortcuts: Shortcut[] = [];

  if (isHome) {
    homeShortcuts = [
      { k: SHORTCUTS.NAV_PREV.display, label: "Previous day" },
      { k: SHORTCUTS.NAV_NEXT.display, label: "Next day" },
      { k: "Enter", label: "Go to Today" },
    ];
  }

  if (isToday) {
    // j/k/t have view-specific labels in the day context, so they are built manually.
    // Key strings still come from the registry — they cannot drift.
    dayShortcuts = [
      { k: SHORTCUTS.NAV_PREV.display, label: "Previous day" },
      { k: SHORTCUTS.NAV_NEXT.display, label: "Next day" },
      {
        k: SHORTCUTS.NAV_TODAY.display,
        label: (() => {
          if (!currentDate) return "Go to today";
          return currentDate.isSame(dayjs(), "day")
            ? "Scroll to now"
            : "Go to today";
        })(),
      },
    ];

    dayTaskShortcuts = [
      {
        k: SHORTCUTS.DAY_FOCUS_TASKS.display,
        label: SHORTCUTS.DAY_FOCUS_TASKS.label,
      },
      {
        k: SHORTCUTS.DAY_CREATE_TASK.display,
        label: SHORTCUTS.DAY_CREATE_TASK.label,
      },
      {
        k: SHORTCUTS.DAY_EDIT_TASK.display,
        label: SHORTCUTS.DAY_EDIT_TASK.label,
      },
      { k: "Delete", label: "Delete task" },
    ];

    dayAgendaShortcuts = [
      {
        k: SHORTCUTS.DAY_FOCUS_AGENDA.display,
        label: SHORTCUTS.DAY_FOCUS_AGENDA.label,
      },
      {
        k: SHORTCUTS.DAY_EDIT_EVENT.display,
        label: SHORTCUTS.DAY_EDIT_EVENT.label,
      },
    ];
  }

  if (isNow) {
    nowShortcuts = [
      {
        k: SHORTCUTS.NOW_FOCUS_DESC.sequence.map((key) => key.toLowerCase()),
        label: SHORTCUTS.NOW_FOCUS_DESC.label,
      },
      {
        k: SHORTCUTS.NOW_SAVE_DESC.display,
        label: SHORTCUTS.NOW_SAVE_DESC.label,
      },
      { k: SHORTCUTS.NAV_PREV.display, label: "Previous task" },
      { k: SHORTCUTS.NAV_NEXT.display, label: "Next task" },
      {
        k: SHORTCUTS.NOW_COMPLETE_TASK.display,
        label: SHORTCUTS.NOW_COMPLETE_TASK.label,
      },
      { k: SHORTCUTS.NOW_ESCAPE.display, label: SHORTCUTS.NOW_ESCAPE.label },
    ];
  }

  return {
    globalShortcuts,
    homeShortcuts,
    dayShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    nowShortcuts,
    isHome,
    isToday,
    isNow,
  };
};
