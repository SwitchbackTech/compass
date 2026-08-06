import { type ShortcutOverlaySection } from "@web/shortcuts/shortcuts-overlay.types";
import { type Shortcut } from "@web/shortcuts/global.shortcut.types";
import {
  LIFE_SHORTCUT,
  VIEW_SHORTCUTS,
} from "@web/shortcuts/shortcuts.constants";

export type ShortcutMenuView = "day" | "week" | "life";

interface ShortcutMenuConfig {
  view: ShortcutMenuView;
  /** Day: viewing today. Week: viewing the current week. Drives the "t" label. */
  isViewingCurrentPeriod: boolean;
}

const getNavigateShortcuts = ({
  view,
  isViewingCurrentPeriod,
}: ShortcutMenuConfig): Shortcut[] => {
  const alternateView =
    view === "day" ? VIEW_SHORTCUTS.week : VIEW_SHORTCUTS.day;

  if (view === "life") {
    return [
      { keys: ["j"], label: "Previous life variation" },
      { keys: ["k"], label: "Next life variation" },
      { keys: ["t"], label: "Focus current week" },
      { keys: [VIEW_SHORTCUTS.day.key], label: "Go to Day view" },
      { keys: [VIEW_SHORTCUTS.week.key], label: "Go to Week view" },
    ];
  }

  return [
    { keys: ["n"], label: "Open Up Next event" },
    { keys: ["v"], label: "Join Up Next meeting" },
    { keys: ["j"], label: `Previous ${view}` },
    { keys: ["k"], label: `Next ${view}` },
    ...(view === "week"
      ? [
          { keys: ["Shift", "j"], label: "Shift view back one day" },
          { keys: ["Shift", "k"], label: "Shift view forward one day" },
        ]
      : []),
    {
      keys: ["t"],
      label: isViewingCurrentPeriod
        ? "Scroll to now"
        : view === "day"
          ? "Go to today"
          : "Go to current week",
    },
    {
      keys: [alternateView.key],
      label: `Go to ${alternateView.label} view`,
    },
    {
      keys: [LIFE_SHORTCUT.key],
      label: `Go to ${LIFE_SHORTCUT.label} view`,
    },
  ];
};

const getCreateShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "life"
    ? []
    : [
        { keys: ["c"], label: "Create timed event" },
        { keys: ["a"], label: "Create all-day event" },
      ];

const getEditShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "life"
    ? []
    : [
        { keys: ["Enter"], label: "Open focused event" },
        { keys: ["Delete"], label: "Delete focused event" },
        { keys: ["Mod", "D"], label: "Duplicate focused event" },
        { keys: ["Mod", "Enter"], label: "Save event form" },
        { keys: ["ArrowUp"], label: "Focus previous event" },
        { keys: ["ArrowDown"], label: "Focus next event" },
        { keys: ["Arrow keys"], label: "Move draft event" },
        {
          keys: ["Shift", "ArrowLeft"],
          label: "Move event to previous day",
        },
        {
          keys: ["Shift", "ArrowRight"],
          label: "Move event to next day",
        },
        { keys: ["Shift", "ArrowUp"], label: "Move event 15 min earlier" },
        { keys: ["Shift", "ArrowDown"], label: "Move event 15 min later" },
      ];

const getFocusShortcuts = (view: ShortcutMenuView): Shortcut[] =>
  view === "life"
    ? []
    : [
        { keys: ["i"], label: "Focus sidebar" },
        { keys: ["u"], label: "Focus calendar event" },
      ];

const getOtherShortcuts = (): Shortcut[] => [
  { keys: ["]"], label: "Toggle sidebar" },
  { keys: ["?"], label: "Toggle shortcuts" },
  { keys: ["Mod", "k"], label: "Command Palette" },
  { keys: ["Mod", ","], label: "Settings" },
  { keys: ["Mod", "Z"], label: "Undo last change" },
  { keys: ["Mod", "Shift", "Z"], label: "Redo last change" },
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
  ].filter((section) => section.shortcuts.length > 0);
};
