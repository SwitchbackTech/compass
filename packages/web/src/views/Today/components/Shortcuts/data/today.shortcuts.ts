import { Shortcut } from "../types/shortcut.types";

// Define all possible shortcut keys as a const object for type safety
export const SHORTCUT_KEYS = {
  // Global shortcuts
  "0": "0",
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

// Extract the union type of all shortcut keys
export type ShortcutKey = (typeof SHORTCUT_KEYS)[keyof typeof SHORTCUT_KEYS];

export interface ShortcutsConfig {
  isHome?: boolean;
  isToday?: boolean;
  isNow?: boolean;
}

export const getTodayShortcuts = (config: ShortcutsConfig = {}) => {
  const { isHome = false, isToday = true, isNow = false } = config;

  const global: Shortcut[] = [
    { k: "0", label: "Home" },
    { k: "1", label: "Now" },
    { k: "2", label: "Today" },
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
      { k: "t", label: "Go to today" },
    ];
    dayAgendaShortcuts = [
      { k: "i", label: "Focus on calendar" },
      { k: "e", label: "Edit event title" },
      { k: "Delete", label: "Delete event" },
      { k: "↑", label: "Move up 15m" },
      { k: "↓", label: "Move down 15m" },
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
