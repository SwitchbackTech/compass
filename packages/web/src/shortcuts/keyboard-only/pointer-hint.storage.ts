import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { persistentBrowserStore } from "@web/common/storage/browser-key-value.store";

const store = persistentBrowserStore;

export const readPointerHintLifetimeCount = (): number => {
  const raw = store.get(STORAGE_KEYS.POINTER_HINT_LIFETIME_COUNT);
  const parsed = Number(raw ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
};

export const writePointerHintLifetimeCount = (count: number) => {
  store.set(STORAGE_KEYS.POINTER_HINT_LIFETIME_COUNT, String(count));
};

export const readPointerHintDismissedPermanently = (): boolean =>
  store.get(STORAGE_KEYS.POINTER_HINT_DISMISSED_PERMANENTLY) === "true";

export const writePointerHintDismissedPermanently = () => {
  store.set(STORAGE_KEYS.POINTER_HINT_DISMISSED_PERMANENTLY, "true");
};

export const readPointerHintLastShownAt = (): number | null => {
  const raw = store.get(STORAGE_KEYS.POINTER_HINT_LAST_SHOWN_AT);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

export const writePointerHintLastShownAt = (timestampMs: number) => {
  store.set(STORAGE_KEYS.POINTER_HINT_LAST_SHOWN_AT, String(timestampMs));
};

/** Test-only reset for persisted hint guardrails. */
export const resetPointerHintPersistenceForTests = () => {
  store.remove(STORAGE_KEYS.POINTER_HINT_LIFETIME_COUNT);
  store.remove(STORAGE_KEYS.POINTER_HINT_DISMISSED_PERMANENTLY);
  store.remove(STORAGE_KEYS.POINTER_HINT_LAST_SHOWN_AT);
};
