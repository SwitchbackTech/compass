import { z } from "zod";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  clampLifespan,
  DEFAULT_LIFESPAN,
  LIFE_VARIATIONS,
  type LifeVariation,
  parseLifeDate,
} from "./life.utils";

const LifePreferencesSchema = z.object({
  birthDate: z.string().default(""),
  lifespan: z.number().default(DEFAULT_LIFESPAN),
  variation: z.enum(["average", "long", "random"]).default("average"),
});

export interface LifePreferences {
  birthDate: string;
  lifespan: number;
  variation: LifeVariation;
}

export const DEFAULT_LIFE_PREFERENCES: LifePreferences = {
  birthDate: "",
  lifespan: LIFE_VARIATIONS.average.defaultLifespan,
  variation: "average",
};

function normalizeLifePreferences(
  preferences: LifePreferences,
): LifePreferences {
  return {
    birthDate: parseLifeDate(preferences.birthDate)
      ? preferences.birthDate
      : "",
    lifespan: clampLifespan(preferences.lifespan),
    variation: preferences.variation,
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
