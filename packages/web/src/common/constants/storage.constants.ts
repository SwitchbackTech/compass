import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.auth",
  "compass.onboarding.has-seen-welcome",
  "compass.sidebar.width",
  "compass.view.sidebar-open",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "AUTH" | "HAS_SEEN_WELCOME" | "SIDEBAR_WIDTH" | "SIDEBAR_OPEN",
  StorageKey
> = {
  AUTH: "compass.auth",
  HAS_SEEN_WELCOME: "compass.onboarding.has-seen-welcome",
  SIDEBAR_WIDTH: "compass.sidebar.width",
  SIDEBAR_OPEN: "compass.view.sidebar-open",
} as const;
