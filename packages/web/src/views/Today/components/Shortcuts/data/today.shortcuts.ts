import { Shortcut } from "../types/shortcut.types";

export const getTodayShortcuts = () => {
  const global: Shortcut[] = [
    { k: "0", label: "Home" },
    { k: "1", label: "Now" },
    { k: "2", label: "Today" },
    { k: "3", label: "Week" },
  ];

  const isToday = true;
  const isHome = false;
  const isNow = false;

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
  return {
    global,
    homeShortcuts,
    dayTaskShortcuts,
    dayAgendaShortcuts,
    nowShortcuts,
    isHome,
    isToday,
    isNow,
  };
};
