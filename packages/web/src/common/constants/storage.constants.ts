import { z } from "zod";

export const StorageKeySchema = z.enum(["compass.reminder", "compass.auth"]);

export type StorageKey = z.infer<typeof StorageKeySchema>;

export const STORAGE_KEYS: Record<"REMINDER" | "AUTH", StorageKey> = {
  REMINDER: "compass.reminder",
  AUTH: "compass.auth",
} as const;
