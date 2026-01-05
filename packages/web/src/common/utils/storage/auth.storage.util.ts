import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";

export const AuthStorageSchema = z.object({
  hasCompletedSignup: z.boolean().default(false),
  skipOnboarding: z.boolean().default(false),
  authPromptDismissed: z.boolean().default(false),
});

export type AuthStorage = z.infer<typeof AuthStorageSchema>;

const DEFAULT_AUTH_STORAGE: AuthStorage = {
  hasCompletedSignup: false,
  skipOnboarding: false,
  authPromptDismissed: false,
};

export function getAuthStorage(): AuthStorage {
  if (typeof window === "undefined") return DEFAULT_AUTH_STORAGE;

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (stored) {
      const parsed = JSON.parse(stored);
      const result = AuthStorageSchema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
    }

    return DEFAULT_AUTH_STORAGE;
  } catch {
    return DEFAULT_AUTH_STORAGE;
  }
}

export function updateAuthStorage(updates: Partial<AuthStorage>): void {
  if (typeof window === "undefined") return;

  try {
    const current = getAuthStorage();
    const updated: AuthStorage = {
      ...current,
      ...updates,
    };

    const result = AuthStorageSchema.safeParse(updated);
    if (result.success) {
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(result.data));
    }
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
