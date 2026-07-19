import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.auth",
  "compass.onboarding.has-seen-welcome",
  "compass.onboarding.has-dismissed-tasks-removal-notice",
  "compass.sidebar.width",
  "compass.theme",
  "compass.view.sidebar-open",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  | "AUTH"
  | "HAS_SEEN_WELCOME"
  | "HAS_DISMISSED_TASKS_REMOVAL_NOTICE"
  | "SIDEBAR_WIDTH"
  | "SIDEBAR_OPEN"
  | "THEME",
  StorageKey
> = {
  AUTH: "compass.auth",
  HAS_SEEN_WELCOME: "compass.onboarding.has-seen-welcome",
  HAS_DISMISSED_TASKS_REMOVAL_NOTICE:
    "compass.onboarding.has-dismissed-tasks-removal-notice",
  SIDEBAR_WIDTH: "compass.sidebar.width",
  SIDEBAR_OPEN: "compass.view.sidebar-open",
  THEME: "compass.theme",
} as const;
