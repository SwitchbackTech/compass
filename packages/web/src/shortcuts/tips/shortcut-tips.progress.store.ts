import { useSyncExternalStore } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import {
  createExternalStore,
  subscribeToStorageKey,
} from "@web/common/utils/external-store.util";
import { useShortcutShowcaseStore } from "@web/components/ShortcutShowcase/showcase.store";
import { type ShortcutHintId } from "@web/shortcuts/tips/shortcut-tips.data";
import {
  EMPTY_SHORTCUT_HINT_PROGRESS,
  readShortcutHintProgress,
  type ShortcutHintProgress,
  writeShortcutHintProgress,
} from "@web/shortcuts/tips/shortcut-tips.progress.storage";

const progressStore = createExternalStore<ShortcutHintProgress>(
  readShortcutHintProgress(),
);

function refreshFromStorage(): void {
  progressStore.set(readShortcutHintProgress());
}

function subscribe(onChange: () => void): () => void {
  const unsubscribeStore = progressStore.subscribe(onChange);
  const unsubscribeStorage = subscribeToStorageKey(
    STORAGE_KEYS.SHORTCUT_TIPS_DEMONSTRATED,
    refreshFromStorage,
  );

  return () => {
    unsubscribeStore();
    unsubscribeStorage();
  };
}

export function getShortcutHintProgress(): ShortcutHintProgress {
  return progressStore.get();
}

export function useShortcutHintProgress(): ShortcutHintProgress {
  return useSyncExternalStore(subscribe, progressStore.get);
}

export const shortcutHintProgressActions = {
  /**
   * Records that the user performed a taught primitive. No-ops while the
   * Shortcut Showcase is open so practice does not skip real-calendar tips.
   */
  demonstrate: (id: ShortcutHintId): void => {
    if (useShortcutShowcaseStore.getState().isActive) return;

    const current = progressStore.get();
    const demonstratedIds = current.demonstratedIds.includes(id)
      ? current.demonstratedIds
      : [...current.demonstratedIds, id];
    const next: ShortcutHintProgress = { demonstratedIds, lastUsedId: id };
    if (
      next.lastUsedId === current.lastUsedId &&
      next.demonstratedIds === current.demonstratedIds
    ) {
      return;
    }
    if (writeShortcutHintProgress(next)) progressStore.set(next);
  },
};

/** Test-only: resyncs the in-memory store from storage. Registered in
 * reset-stores.ts for between-test cleanup. */
export function resetShortcutHintProgressStoreForTests(): void {
  progressStore.set(EMPTY_SHORTCUT_HINT_PROGRESS);
  refreshFromStorage();
}
