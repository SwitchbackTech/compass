import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.auth",
  "compass.onboarding.has-seen-welcome",
  "compass.day.task-list-width",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "AUTH" | "HAS_SEEN_WELCOME" | "DAY_TASK_LIST_WIDTH",
  StorageKey
> = {
  AUTH: "compass.auth",
  HAS_SEEN_WELCOME: "compass.onboarding.has-seen-welcome",
  DAY_TASK_LIST_WIDTH: "compass.day.task-list-width",
} as const;
