import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import { clampLifespan, DEFAULT_LIFESPAN, parseLifeDate } from "./life.utils";

const LifePreferencesSchema = z.object({
  birthDate: z.string().default(""),
  lifespan: z.number().default(DEFAULT_LIFESPAN),
});

export interface LifePreferences {
  birthDate: string;
  lifespan: number;
}

export const DEFAULT_LIFE_PREFERENCES: LifePreferences = {
  birthDate: "",
  lifespan: DEFAULT_LIFESPAN,
};

function normalizeLifePreferences(
  preferences: LifePreferences,
): LifePreferences {
  return {
    birthDate: parseLifeDate(preferences.birthDate)
      ? preferences.birthDate
      : "",
    lifespan: clampLifespan(preferences.lifespan),
  };
}

export function readLifePreferences(): LifePreferences {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.LIFE_PREFERENCES);
  if (!raw) return DEFAULT_LIFE_PREFERENCES;

  try {
    return normalizeLifePreferences(
      LifePreferencesSchema.parse(JSON.parse(raw)),
    );
  } catch {
    return DEFAULT_LIFE_PREFERENCES;
  }
}

export function writeLifePreferences(preferences: LifePreferences) {
  persistentBrowserStore.set(
    STORAGE_KEYS.LIFE_PREFERENCES,
    JSON.stringify(normalizeLifePreferences(preferences)),
  );
}
