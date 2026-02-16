import dayjs from "@core/util/date/dayjs";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { Shortcut } from "@web/common/types/global.shortcut.types";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";

interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  isNow?: boolean;
  currentDate?: dayjs.Dayjs;
}

export const getShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, isNow = false, currentDate } = config;

  const globalShortcuts: Shortcut[] = [
    { k: VIEW_SHORTCUTS.now.key, label: VIEW_SHORTCUTS.now.label },
    { k: VIEW_SHORTCUTS.day.key, label: VIEW_SHORTCUTS.day.label },
    { k: VIEW_SHORTCUTS.week.key, label: VIEW_SHORTCUTS.week.label },
    { k: "r", label: "Edit reminder" },
    { k: "z", label: "Logout" },
    { k: `${getModifierKey()}+k`, label: "Command Palette" },
  ];

  let homeShortcuts: Shortcut[] = [];
  let dayShortcuts: Shortcut[] = [];
  let dayTaskShortcuts: Shortcut[] = [];
  let dayAgendaShortcuts: Shortcut[] = [];
  let nowShortcuts: Shortcut[] = [];

  if (isHome) {
    homeShortcuts = [
      { k: "j", label: "Previous day" },
      { k: "k", label: "Next day" },
      { k: "Enter", label: "Go to Today" },
    ];
  }

  if (isToday) {
    dayShortcuts = [
      { k: "j", label: "Previous day" },
      { k: "k", label: "Next day" },
      {
        k: "t",
        label: (() => {
          if (!currentDate) return "Go to today";

          return currentDate.isSame(dayjs(), "day")
            ? "Scroll to now"
            : "Go to today";
        })(),
      },
    ];

    dayTaskShortcuts = [
      { k: "u", label: "Focus on tasks" },
      { k: "c", label: "Create task" },
      { k: "e", label: "Edit task" },
      { k: "Delete", label: "Delete task" },
    ];
    dayAgendaShortcuts = [
      { k: "i", label: "Focus on calendar" },
      { k: "m", label: "Edit event" },
    ];
  }
  if (isNow) {
    nowShortcuts = [
      { k: "d", label: "Edit description" },
      { k: `${getModifierKey()}+Enter`, label: "Save description" },
      { k: "j", label: "Previous task" },
      { k: "k", label: "Next task" },
      { k: "Enter", label: "Mark complete" },
      { k: "Esc", label: "Back to Today" },
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
