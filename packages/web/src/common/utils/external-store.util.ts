/**
 *
 * Minimal mutable value container designed for React's `useSyncExternalStore`.
 * Read it imperatively with `get()`, update it with `set()`, and observe it via
 * `subscribe()` (which returns an unsubscribe function).
 *
 * Usage in a component/hook:
 *   useSyncExternalStore(store.subscribe, store.get)
 */
interface ExternalStore<T> {
  get: () => T;
  set: (next: T) => void;
  subscribe: (onChange: () => void) => () => void;
}

export function createExternalStore<T>(initial: T): ExternalStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;

      value = next;
      listeners.forEach((listener) => listener());
    },
    subscribe: (onChange) => {
      listeners.add(onChange);

      return () => void listeners.delete(onChange);
    },
  };
}

/**
 * Cross-tab sync for a single localStorage key: a write in another tab fires
 * "storage" here (browsers never fire it in the writing tab itself), so this
 * calls `onChange` to let the caller re-read its own source of truth. Shared
 * by every store that mirrors one localStorage key (auth state, calendar
 * visibility) so the window-listener wiring exists in one place.
 */
export function subscribeToStorageKey(
  key: string,
  onChange: () => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === key) onChange();
  };
  window.addEventListener("storage", handleStorage);

  return () => window.removeEventListener("storage", handleStorage);
}
