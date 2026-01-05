import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.reminder",
  "compass.auth",
  "compass.onboarding",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "REMINDER" | "AUTH" | "ONBOARDING_PROGRESS",
  StorageKey
> = {
  REMINDER: "compass.reminder",
  AUTH: "compass.auth",
  ONBOARDING_PROGRESS: "compass.onboarding",
} as const;
