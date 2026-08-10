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
  {
    id: "focus-shift-hold",
    keys: ["Shift"],
    label: "Toggle event jump keys",
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
    id: "edit-focus-location",
    keys: ["e", "l"],
    label: "Edit location",
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
    id: "form-jump-title",
    keys: ["Mod", "Shift", "I"],
    label: "Jump to title",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-location",
    keys: ["Mod", "Shift", "L"],
    label: "Jump to location",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-description",
    keys: ["Mod", "Shift", "D"],
    label: "Jump to description",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-start",
    keys: ["Mod", "Shift", "S"],
    label: "Jump to start time",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-end",
    keys: ["Mod", "Shift", "E"],
    label: "Jump to end time",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-recurrence",
    keys: ["Mod", "Shift", "R"],
    label: "Jump to recurrence",
    section: "edit",
    when: { isFormOpen: true },
  },
  {
    id: "form-jump-calendar",
    keys: ["Mod", "Shift", "C"],
    label: "Jump to calendar",
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
    id: "edit-focus-left",
    keys: ["ArrowLeft"],
    label: "Focus event on previous day",
    section: "edit",
  },
  {
    id: "edit-focus-right",
    keys: ["ArrowRight"],
    label: "Focus event on next day",
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
  {
    id: "other-keyboard-only",
    keys: ["Shift", "Shift"],
    label: "Toggle keyboard-only mode",
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
    } else if (shortcut.id === "edit-focus-prev") {
      label =
        view === "week"
          ? "Focus previous event on day"
          : "Focus previous event";
    } else if (shortcut.id === "edit-focus-next") {
      label = view === "week" ? "Focus next event on day" : "Focus next event";
    } else if (shortcut.id === "edit-focus-left") {
      label =
        view === "day"
          ? "Previous day and focus first event"
          : "Focus event on previous day";
    } else if (shortcut.id === "edit-focus-right") {
      label =
        view === "day"
          ? "Next day and focus first event"
          : "Focus event on next day";
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

const SECTION_TITLES: Record<string, string> = {
  navigate: "Navigate",
  create: "Create",
  focus: "Focus",
  edit: "Edit",
  other: "Other",
};

/**
 * Get shortcuts grouped by section, in display order. Used for the legend
 * overlay.
 */
export const getShortcutsBySection = (
  shortcuts: Shortcut[],
): { id: string; title: string; shortcuts: Shortcut[] }[] =>
  Object.entries(SECTION_TITLES)
    .map(([id, title]) => ({
      id,
      title,
      shortcuts: shortcuts.filter((shortcut) => shortcut.section === id),
    }))
    .filter((section) => section.shortcuts.length > 0);
