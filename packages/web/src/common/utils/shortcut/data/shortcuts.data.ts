import dayjs from "@core/util/date/dayjs";
import { Shortcut } from "@web/common/types/global.shortcut.types";

interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  isNow?: boolean;
  currentDate?: dayjs.Dayjs;
}

export const getShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, isNow = false, currentDate } = config;

  const globalShortcuts: Shortcut[] = [
    { k: "1", label: "Now" },
    { k: "2", label: "Day" },
    { k: "3", label: "Week" },
  ];

  const cmdPaletteShortcuts: Shortcut[] = [
    { k: "⌘K", label: "Command Palette" },
  ];

  let homeShortcuts: Shortcut[] = [];
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
    dayTaskShortcuts = [
      { k: "u", label: "Focus on tasks" },
      { k: "c", label: "Create task" },
      { k: "e", label: "Edit task" },
      { k: "Delete", label: "Delete task" },
    ];
    dayAgendaShortcuts = [
      { k: "i", label: "Focus on calendar" },
      {
        k: "t",
        label: (() => {
          if (!currentDate) return "Go to today";
          // Compare dates in the same timezone (UTC) to avoid timezone issues
          const todayUTC = dayjs().startOf("day").utc();
          return currentDate.isSame(todayUTC, "day")
            ? "Scroll to now"
            : "Go to today";
        })(),
      },
    ];
  }
  if (isNow) {
    nowShortcuts = [
      { k: "j", label: "Previous task" },
      { k: "k", label: "Next task" },
      { k: "Enter", label: "Mark complete" },
      { k: "Esc", label: "Back to Today" },
    ];
  }

  return {
    globalShortcuts,
    homeShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    nowShortcuts,
    cmdPaletteShortcuts,
    isHome,
    isToday,
    isNow,
  };
};
