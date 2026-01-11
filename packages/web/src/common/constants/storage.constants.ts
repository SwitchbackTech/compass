import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.reminder",
  "compass.onboarding",
  "compass.hasAuthenticated",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  "REMINDER" | "ONBOARDING_PROGRESS" | "HAS_AUTHENTICATED",
  StorageKey
> = {
  REMINDER: "compass.reminder",
  ONBOARDING_PROGRESS: "compass.onboarding",
  HAS_AUTHENTICATED: "compass.hasAuthenticated",
} as const;
