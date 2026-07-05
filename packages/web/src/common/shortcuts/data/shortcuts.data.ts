import { VIEW_SHORTCUTS } from "@web/common/constants/shortcuts.constants";
import { type Shortcut } from "@web/common/types/global.shortcut.types";
import { type ShortcutOverlaySection } from "@web/components/Shortcuts/ShortcutOverlay/ShortcutsOverlay";

export type ShortcutMenuView = "day" | "week";

interface ShortcutMenuConfig {
  view: ShortcutMenuView;
  /** Day: viewing today. Week: viewing the current week. Drives the "t" label. */
  isViewingCurrentPeriod: boolean;
}

const getNavigateShortcuts = ({
  view,
  isViewingCurrentPeriod,
}: ShortcutMenuConfig): Shortcut[] => [
  { keys: ["j"], label: `Previous ${view}` },
  { keys: ["k"], label: `Next ${view}` },
  {
    keys: ["t"],
    label: isViewingCurrentPeriod
      ? "Scroll to now"
      : view === "day"
        ? "Go to today"
        : "Go to current week",
  },
  {
    keys: [VIEW_SHORTCUTS.day.key],
    label: `Go to ${VIEW_SHORTCUTS.day.label} view`,
  },
  {
    keys: [VIEW_SHORTCUTS.week.key],
    label: `Go to ${VIEW_SHORTCUTS.week.label} view`,
  },
];

const getCreateShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "day"
    ? [
        { keys: ["c"], label: "Create task" },
        { keys: ["a"], label: "Create all-day event" },
      ]
    : [
        { keys: ["c"], label: "Create timed event" },
        { keys: ["a"], label: "Create all-day event" },
        { keys: ["Shift", "w"], label: "Create Someday week event" },
        { keys: ["Shift", "m"], label: "Create Someday month event" },
      ];

const getFocusShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "day"
    ? [
        { keys: ["u"], label: "Focus tasks" },
        { keys: ["i"], label: "Focus calendar" },
      ]
    : [
        { keys: ["u"], label: "Focus sidebar" },
        { keys: ["i"], label: "Focus calendar event" },
      ];

const getEditShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "day"
    ? [
        { keys: ["e"], label: "Edit task" },
        { keys: ["Enter"], label: "Complete task" },
        { keys: ["Delete"], label: "Delete task" },
        { keys: ["Ctrl", "Mod", "ArrowRight"], label: "Migrate task forward" },
        { keys: ["Ctrl", "Mod", "ArrowLeft"], label: "Migrate task backward" },
        { keys: ["m"], label: "Edit event" },
      ]
    : [
        { keys: ["m"], label: "Edit calendar event" },
        { keys: ["Delete"], label: "Delete calendar event" },
        { keys: ["Arrow keys"], label: "Move draft event" },
      ];

const getOtherShortcuts = (): Shortcut[] => [
  { keys: ["["], label: "Toggle sidebar" },
  { keys: ["?"], label: "Toggle shortcuts" },
  { keys: ["Mod", "k"], label: "Command Palette" },
];

/**
 * Single source of truth for the shortcut help menu. Sections are grouped by
 * the type of action (not by view area) and shared across views; only labels
 * and view-specific keys differ.
 */
export const getShortcutMenuSections = (
  config: ShortcutMenuConfig,
): ShortcutOverlaySection[] => {
  const { view } = config;

  return [
    {
      id: "navigate",
      title: "Navigate",
      shortcuts: getNavigateShortcuts(config),
    },
    { id: "create", title: "Create", shortcuts: getCreateShortcuts(view) },
    { id: "focus", title: "Focus", shortcuts: getFocusShortcuts(view) },
    { id: "edit", title: "Edit", shortcuts: getEditShortcuts(view) },
    { id: "other", title: "Other", shortcuts: getOtherShortcuts() },
  ];
};
