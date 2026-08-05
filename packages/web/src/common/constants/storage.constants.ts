type StorageKey =
  | "compass.auth"
  | "compass.onboarding.has-seen-welcome"
  | "compass.onboarding.has-seen-cmd-palette-hint"
  | "compass.onboarding.has-seen-anonymous-save-toast"
  | "compass.onboarding.has-dismissed-demo-events-banner"
  | "compass.onboarding.has-dismissed-tasks-removal-notice"
  | "compass.sidebar.width"
  | "compass.theme"
  | "compass.life.preferences"
  | "compass.view.sidebar-open"
  // S39 A2: client-owned calendar visibility (default visible). Device-local,
  // matching other compass.* prefs — not synced across browsers.
  | "compass.calendars.hidden-ids"
  // Which calendar new events are created on. Device-local like the rest;
  // an unknown or stale id falls back to the derived default.
  | "compass.calendars.default-id"
  // Which accounts' calendar rows are collapsed in the sidebar. Device-local;
  // an unknown or stale key falls back to expanded (default).
  | "compass.calendars.collapsed-accounts"
  // Recently-used command palette item ids, most recent first. Device-local;
  // an id that no longer resolves to a visible item is skipped, not an error.
  | "compass.commands.recent";

export const STORAGE_KEYS: Record<
  | "AUTH"
  | "HAS_SEEN_WELCOME"
  | "HAS_SEEN_CMD_PALETTE_HINT"
  | "HAS_SEEN_ANONYMOUS_SAVE_TOAST"
  | "HAS_DISMISSED_DEMO_EVENTS_BANNER"
  | "HAS_DISMISSED_TASKS_REMOVAL_NOTICE"
  | "LIFE_PREFERENCES"
  | "SIDEBAR_WIDTH"
  | "SIDEBAR_OPEN"
  | "THEME"
  | "HIDDEN_CALENDAR_IDS"
  | "DEFAULT_CALENDAR_ID"
  | "COLLAPSED_ACCOUNTS"
  | "RECENT_COMMANDS",
  StorageKey
> = {
  AUTH: "compass.auth",
  HAS_SEEN_WELCOME: "compass.onboarding.has-seen-welcome",
  HAS_SEEN_CMD_PALETTE_HINT: "compass.onboarding.has-seen-cmd-palette-hint",
  HAS_SEEN_ANONYMOUS_SAVE_TOAST:
    "compass.onboarding.has-seen-anonymous-save-toast",
  HAS_DISMISSED_DEMO_EVENTS_BANNER:
    "compass.onboarding.has-dismissed-demo-events-banner",
  HAS_DISMISSED_TASKS_REMOVAL_NOTICE:
    "compass.onboarding.has-dismissed-tasks-removal-notice",
  LIFE_PREFERENCES: "compass.life.preferences",
  SIDEBAR_WIDTH: "compass.sidebar.width",
  SIDEBAR_OPEN: "compass.view.sidebar-open",
  THEME: "compass.theme",
  HIDDEN_CALENDAR_IDS: "compass.calendars.hidden-ids",
  DEFAULT_CALENDAR_ID: "compass.calendars.default-id",
  COLLAPSED_ACCOUNTS: "compass.calendars.collapsed-accounts",
  RECENT_COMMANDS: "compass.commands.recent",
} as const;
