import { z } from "zod/v4";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  SHORTCUT_HINTS,
  type ShortcutActionId,
} from "@web/shortcuts/tips/shortcut-tips.data";

export type ShortcutActionUsage = {
  invocations: number;
  lastInvokedAt?: number;
  lastShownAt?: number;
  recentImpressions: number;
};

export type ShortcutUsageProfile = {
  version: 1;
  actions: Partial<Record<ShortcutActionId, ShortcutActionUsage>>;
};

const ActionUsageSchema = z.object({
  invocations: z.number().int().nonnegative(),
  lastInvokedAt: z.number().int().nonnegative().optional(),
  lastShownAt: z.number().int().nonnegative().optional(),
  recentImpressions: z.number().int().nonnegative(),
});

const ProfileSchema = z.object({
  version: z.literal(1),
  actions: z.record(z.string(), ActionUsageSchema),
});

const EMPTY_PROFILE: ShortcutUsageProfile = { version: 1, actions: {} };
const actionIds = new Set<ShortcutActionId>(
  Object.values(SHORTCUT_HINTS).map((hint) => hint.actionId),
);

export function readShortcutUsageProfile(): ShortcutUsageProfile {
  const raw = persistentBrowserStore.get(STORAGE_KEYS.SHORTCUT_PERSONALIZATION);
  if (!raw) return EMPTY_PROFILE;

  try {
    const parsed = ProfileSchema.parse(JSON.parse(raw));
    const actions: ShortcutUsageProfile["actions"] = {};
    for (const [actionId, usage] of Object.entries(parsed.actions)) {
      if (actionIds.has(actionId as ShortcutActionId)) {
        actions[actionId as ShortcutActionId] = usage;
      }
    }
    return { version: 1, actions };
  } catch {
    return EMPTY_PROFILE;
  }
}

export function writeShortcutUsageProfile(
  profile: ShortcutUsageProfile,
): boolean {
  return persistentBrowserStore.set(
    STORAGE_KEYS.SHORTCUT_PERSONALIZATION,
    JSON.stringify(profile),
  );
}
