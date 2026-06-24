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
    { keys: [VIEW_SHORTCUTS.day.key], label: VIEW_SHORTCUTS.day.label },
    { keys: [VIEW_SHORTCUTS.week.key], label: VIEW_SHORTCUTS.week.label },
    { keys: ["["], label: "Close sidebar" },
    { keys: ["?"], label: "Show shortcuts" },
    { keys: ["Mod", "k"], label: "Command Palette" },
  ];

  let homeShortcuts: Shortcut[] = [];
  let dayShortcuts: Shortcut[] = [];
  let dayTaskShortcuts: Shortcut[] = [];
  let dayAgendaShortcuts: Shortcut[] = [];

  if (isHome) {
    homeShortcuts = [
      { keys: ["j"], label: "Previous day" },
      { keys: ["k"], label: "Next day" },
      { keys: ["Enter"], label: "Go to Today" },
    ];
  }

  if (isToday) {
    dayShortcuts = [
      { keys: ["j"], label: "Previous day" },
      { keys: ["k"], label: "Next day" },
      {
        keys: ["t"],
        label: (() => {
          if (!currentDate) return "Go to today";

          return currentDate.isSame(dayjs(), "day")
            ? "Scroll to now"
            : "Go to today";
        })(),
      },
    ];

    dayTaskShortcuts = [
      { keys: ["u"], label: "Focus on tasks" },
      { keys: ["c"], label: "Create task" },
      { keys: ["e"], label: "Edit task" },
      { keys: ["Delete"], label: "Delete task" },
    ];
    dayAgendaShortcuts = [
      { keys: ["i"], label: "Focus on calendar" },
      { keys: ["m"], label: "Edit event" },
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
