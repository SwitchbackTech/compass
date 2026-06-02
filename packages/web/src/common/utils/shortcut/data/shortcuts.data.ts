import dayjs from "@core/util/date/dayjs";
import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { type Shortcut } from "@web/common/types/global.shortcut.types";

interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  currentDate?: dayjs.Dayjs;
}

export const getShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, currentDate } = config;

  const globalShortcuts: Shortcut[] = [
    { k: VIEW_SHORTCUTS.day.key, label: VIEW_SHORTCUTS.day.label },
    { k: VIEW_SHORTCUTS.week.key, label: VIEW_SHORTCUTS.week.label },
    { k: "[", label: "Close sidebar" },
    { k: "?", label: "Show shortcuts" },
    { k: "Mod+k", label: "Command Palette" },
  ];

  let homeShortcuts: Shortcut[] = [];
  let dayShortcuts: Shortcut[] = [];
  let dayTaskShortcuts: Shortcut[] = [];
  let dayAgendaShortcuts: Shortcut[] = [];

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
  return {
    globalShortcuts,
    homeShortcuts,
    dayShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    isHome,
    isToday,
  };
};
