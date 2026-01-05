import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.reminder",
  "compass.onboarding",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "REMINDER" | "ONBOARDING_PROGRESS",
  StorageKey
> = {
  REMINDER: "compass.reminder",
  ONBOARDING_PROGRESS: "compass.onboarding",
} as const;
