import dayjs from "@core/util/date/dayjs";
import { Shortcut } from "@web/common/types/global.shortcut.types";

// Define all possible shortcut keys as a const object for type safety
export const SHORTCUT_KEYS = {
  // Global shortcuts
  "1": "1",
  "2": "2",
  "3": "3",
  // Navigation shortcuts
  j: "j",
  k: "k",
  t: "t",
  // Task shortcuts
  u: "u",
  c: "c",
  e: "e",
  Delete: "Delete",
  Enter: "Enter",
  Escape: "Escape",
  Esc: "Esc",
  // Calendar shortcuts
  i: "i",
  "↑": "↑",
  "↓": "↓",
} as const;

interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  isNow?: boolean;
  currentDate?: dayjs.Dayjs;
}

export const getShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, isNow = false, currentDate } = config;

  const global: Shortcut[] = [
    { k: "1", label: "Now" },
    { k: "2", label: "Day" },
    { k: "3", label: "Week" },
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
  } else if (isToday) {
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
      // { k: "e", label: "Edit event title" },
      // { k: "Delete", label: "Delete event" },
      // { k: "↑", label: "Move up 15m" },
      // { k: "↓", label: "Move down 15m" },
    ];
  } else if (isNow) {
    nowShortcuts = [
      { k: "j", label: "Previous task" },
      { k: "k", label: "Next task" },
      { k: "Enter", label: "Complete focused task" },
      { k: "Esc", label: "Back to Today" },
    ];
  }

  // Flatten all active shortcuts for easy key extraction
  const allShortcuts = [
    ...global,
    ...homeShortcuts,
    ...dayTaskShortcuts,
    ...dayAgendaShortcuts,
    ...nowShortcuts,
  ];

  return {
    global,
    homeShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    nowShortcuts,
    allShortcuts,
    isHome,
    isToday,
    isNow,
  };
};
