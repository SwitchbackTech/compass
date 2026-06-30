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
