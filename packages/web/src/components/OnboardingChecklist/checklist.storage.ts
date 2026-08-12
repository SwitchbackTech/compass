import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";
import {
  CHECKLIST_ITEM_IDS,
  type ChecklistItemId,
} from "@web/components/OnboardingChecklist/checklist.items";

export type ChecklistProgress = Partial<Record<ChecklistItemId, true>>;

/**
 * Progress persists item-by-item the moment each is detected, so credit is
 * retroactive: a mission done before the user ever looks at the card is
 * already checked when they do.
 */
export function loadChecklistProgress(): ChecklistProgress {
  if (!persistentBrowserStore.isAvailable()) return {};
  const raw = persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_PROGRESS);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const progress: ChecklistProgress = {};
    for (const id of CHECKLIST_ITEM_IDS) {
      if ((parsed as Record<string, unknown>)[id] === true) progress[id] = true;
    }
    return progress;
  } catch {
    return {};
  }
}

export function saveChecklistProgress(progress: ChecklistProgress): void {
  persistentBrowserStore.set(
    STORAGE_KEYS.CHECKLIST_PROGRESS,
    JSON.stringify(progress),
  );
}

export type ChecklistDoneReason = "completed" | "dismissed";

export function getChecklistDone(): ChecklistDoneReason | null {
  if (!persistentBrowserStore.isAvailable()) return null;
  const value = persistentBrowserStore.get(STORAGE_KEYS.CHECKLIST_DONE);
  return value === "completed" || value === "dismissed" ? value : null;
}

export function markChecklistDone(reason: ChecklistDoneReason): void {
  persistentBrowserStore.set(STORAGE_KEYS.CHECKLIST_DONE, reason);
}
