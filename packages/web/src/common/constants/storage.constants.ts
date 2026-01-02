import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.reminder",
  "compass.auth.hasCompletedSignup",
  "compass.auth.skipOnboarding",
  "compass.onboarding",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<
  | "REMINDER"
  | "HAS_COMPLETED_SIGNUP"
  | "SKIP_ONBOARDING"
  | "ONBOARDING_PROGRESS",
  StorageKey
> = {
  REMINDER: "compass.reminder",
  HAS_COMPLETED_SIGNUP: "compass.auth.hasCompletedSignup",
  SKIP_ONBOARDING: "compass.auth.skipOnboarding",
  ONBOARDING_PROGRESS: "compass.onboarding",
} as const;
