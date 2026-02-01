import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.reminder",
  "compass.onboarding",
  "compass.auth",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "REMINDER" | "ONBOARDING_PROGRESS" | "AUTH",
  StorageKey
> = {
  REMINDER: "compass.reminder",
  ONBOARDING_PROGRESS: "compass.onboarding",
  AUTH: "compass.auth",
} as const;
