import { z } from "zod";

export const StorageKeySchema = z.enum([
  "compass.auth",
  "compass.onboarding.has-seen-welcome",
]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<"AUTH" | "HAS_SEEN_WELCOME", StorageKey> = {
  AUTH: "compass.auth",
  HAS_SEEN_WELCOME: "compass.onboarding.has-seen-welcome",
} as const;
