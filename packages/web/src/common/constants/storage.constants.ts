import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.auth",
  "compass.onboarding.has-seen-welcome",
  "compass.onboarding.has-seen-cmd-palette-hint",
  "compass.onboarding.has-seen-anonymous-save-toast",
  "compass.onboarding.has-dismissed-demo-events-banner",
  "compass.onboarding.has-dismissed-tasks-removal-notice",
  "compass.sidebar.width",
  "compass.theme",
  "compass.life.preferences",
  "compass.view.sidebar-open",
  // S39 A2: client-owned calendar visibility (default visible). Device-local,
  // matching other compass.* prefs — not synced across browsers.
  "compass.calendars.hidden-ids",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

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
  | "HIDDEN_CALENDAR_IDS",
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
} as const;
