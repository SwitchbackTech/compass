import { type Shortcut } from "@web/shortcuts/global.shortcut.types";

/**
 * Shortcut registry: single source of truth for all keyboard shortcuts.
 * Each shortcut has an id, section, label, and optional context predicate.
 * The context predicate determines visibility based on app state.
 */
export const SHORTCUTS_REGISTRY: Shortcut[] = [
  // Navigate - Up Next
  {
    id: "nav-up-next",
    keys: ["n"],
    label: "Open Up Next event",
    section: "navigate",
  },
  {
    id: "nav-join-meeting",
    keys: ["v"],
    label: "Join Up Next meeting",
    section: "navigate",
  },

  // Navigate - Life view only
  {
    id: "nav-life-prev",
    keys: ["j"],
    label: "Previous life variation",
    section: "navigate",
    when: { lifeView: true },
  },
  {
    id: "nav-life-next",
    keys: ["k"],
    label: "Next life variation",
    section: "navigate",
    when: { lifeView: true },
  },
  {
    id: "nav-life-current",
    keys: ["t"],
    label: "Focus current week",
    section: "navigate",
    when: { lifeView: true },
  },

  // Navigate - Day/Week views
  {
    id: "nav-previous",
    keys: ["j"],
    label: "Previous",
    section: "navigate",
  },
  {
    id: "nav-next",
    keys: ["k"],
    label: "Next",
    section: "navigate",
  },
  {
    id: "nav-shift-left",
    keys: ["Shift", "j"],
    label: "Shift view back one day",
    section: "navigate",
  },
  {
    id: "nav-shift-right",
    keys: ["Shift", "k"],
    label: "Shift view forward one day",
    section: "navigate",
  },
  {
    id: "nav-today",
    keys: ["t"],
    label: "Go to today",
    section: "navigate",
  },

  // Navigate - View switchers (all views)
  {
    id: "nav-day-view",
    keys: ["d"],
    label: "Go to Day view",
    section: "navigate",
  },
  {
    id: "nav-week-view",
    keys: ["w"],
    label: "Go to Week view",
    section: "navigate",
  },
  {
    id: "nav-life-view",
    keys: ["l"],
    label: "Go to Life view",
    section: "navigate",
  },

  // Create
  {
    id: "create-timed",
    keys: ["c"],
    label: "Create timed event",
    section: "create",
  },
  {
    id: "create-allday",
    keys: ["a"],
    label: "Create all-day event",
    section: "create",
  },

  // Focus
  {
    id: "focus-sidebar",
    keys: ["i"],
    label: "Focus sidebar",
    section: "focus",
  },
  {
    id: "focus-event",
    keys: ["u"],
    label: "Focus calendar event",
    section: "focus",
  },

  // Edit
  {
    id: "edit-open",
    keys: ["Enter"],
    label: "Open focused event",
    section: "edit",
  },
  {
    id: "edit-focus-title",
    keys: ["e", "t"],
    label: "Edit title",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-focus-description",
    keys: ["e", "d"],
    label: "Edit description",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-focus-start",
    keys: ["e", "s"],
    label: "Edit start time",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-focus-end",
    keys: ["e", "e"],
    label: "Edit end time",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-focus-recurrence",
    keys: ["e", "r"],
    label: "Edit recurrence",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-focus-calendar",
    keys: ["e", "c"],
    label: "Edit calendar",
    section: "edit",
    when: { eventFocused: true },
  },
  {
    id: "edit-delete",
    keys: ["Delete"],
    label: "Delete focused event",
    section: "edit",
  },
  {
    id: "edit-duplicate",
    keys: ["Mod", "D"],
    label: "Duplicate focused event",
    section: "edit",
  },
  {
    id: "edit-save",
    keys: ["Mod", "Enter"],
    label: "Save event form",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "edit-focus-prev",
    keys: ["ArrowUp"],
    label: "Focus previous event",
    section: "edit",
  },
  {
    id: "edit-focus-next",
    keys: ["ArrowDown"],
    label: "Focus next event",
    section: "edit",
  },
  {
    id: "edit-move",
    keys: ["Arrow keys"],
    label: "Move draft event",
    section: "edit",
  },
  {
    id: "edit-move-prev-day",
    keys: ["Shift", "ArrowLeft"],
    label: "Move event to previous day",
    section: "edit",
  },
  {
    id: "edit-move-next-day",
    keys: ["Shift", "ArrowRight"],
    label: "Move event to next day",
    section: "edit",
  },
  {
    id: "edit-move-earlier",
    keys: ["Shift", "ArrowUp"],
    label: "Move event 15 min earlier",
    section: "edit",
  },
  {
    id: "edit-move-later",
    keys: ["Shift", "ArrowDown"],
    label: "Move event 15 min later",
    section: "edit",
  },

  // Other
  {
    id: "other-sidebar",
    keys: ["]"],
    label: "Toggle sidebar",
    section: "other",
  },
  {
    id: "other-shortcuts",
    keys: ["?"],
    label: "Toggle shortcuts",
    section: "other",
  },
  {
    id: "other-palette",
    keys: ["Mod", "k"],
    label: "Command Palette",
    section: "other",
  },
  {
    id: "other-settings",
    keys: ["Mod", ","],
    label: "Settings",
    section: "other",
  },
  {
    id: "other-undo",
    keys: ["Mod", "Z"],
    label: "Undo last change",
    section: "other",
  },
  {
    id: "other-redo",
    keys: ["Mod", "Shift", "Z"],
    label: "Redo last change",
    section: "other",
  },
];

interface FilterOptions {
  view: "day" | "week" | "life";
  isViewingCurrentPeriod: boolean;
  eventFocused?: boolean;
  isFormOpen?: boolean;
}

/**
 * Filter shortcuts based on context. Returns a new list of shortcuts that should
 * be visible given the current app state, with view-appropriate labels.
 */
export const filterShortcutsByContext = (
  options: FilterOptions,
): Shortcut[] => {
  const { view, isViewingCurrentPeriod, eventFocused, isFormOpen } = options;

  return SHORTCUTS_REGISTRY.map((shortcut) => {
    // Adjust labels based on view context
    let label = shortcut.label;

    if (shortcut.id === "nav-previous") {
      label = `Previous ${view}`;
    } else if (shortcut.id === "nav-next") {
      label = `Next ${view}`;
    } else if (shortcut.id === "nav-today") {
      if (isViewingCurrentPeriod) {
        label = "Scroll to now";
      } else if (view === "week") {
        label = "Go to current week";
      } else {
        label = "Go to today";
      }
    }

    return { ...shortcut, label };
  }).filter((shortcut) => {
    // Filter by view
    if (view === "life") {
      // Life view shows only life-specific navigate + other shortcuts
      if (
        shortcut.section === "create" ||
        shortcut.section === "focus" ||
        shortcut.section === "edit"
      ) {
        return false;
      }
      // Include navigate shortcuts only if life-specific or view switchers
      if (shortcut.section === "navigate") {
        return (
          shortcut.when?.lifeView === true ||
          shortcut.id === "nav-day-view" ||
          shortcut.id === "nav-week-view"
        );
      }
    } else {
      // Day/week view excludes life-specific shortcuts
      if (shortcut.when?.lifeView === true) {
        return false;
      }
      // Exclude current view switcher (show only alternate view)
      if (
        (view === "day" && shortcut.id === "nav-day-view") ||
        (view === "week" && shortcut.id === "nav-week-view")
      ) {
        return false;
      }
      // Week view includes shift shortcuts, day view should filter them
      if (
        view === "day" &&
        (shortcut.id === "nav-shift-left" || shortcut.id === "nav-shift-right")
      ) {
        return false;
      }
    }

    // Filter by context predicates
    if (shortcut.when?.eventFocused && !eventFocused) {
      return false;
    }
    if (shortcut.when?.isFormOpen && !isFormOpen) {
      return false;
    }

    return true;
  });
};

/**
 * Get shortcuts grouped by section. Used for the legend overlay.
 */
export const getShortcutsBySection = (
  shortcuts: Shortcut[],
): Record<string, { title: string; shortcuts: Shortcut[] }> => {
  const sections: Record<string, { title: string; shortcuts: Shortcut[] }> = {
    navigate: { title: "Navigate", shortcuts: [] },
    create: { title: "Create", shortcuts: [] },
    focus: { title: "Focus", shortcuts: [] },
    edit: { title: "Edit", shortcuts: [] },
    other: { title: "Other", shortcuts: [] },
  };

  shortcuts.forEach((shortcut) => {
    if (sections[shortcut.section]) {
      sections[shortcut.section].shortcuts.push(shortcut);
    }
  });

  return sections;
};
