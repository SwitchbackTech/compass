import { useSyncExternalStore } from "react";
import { createExternalStore } from "@web/common/utils/external-store.util";
import { type EventRepositorySource } from "./event.repository.factory";
import { getEventRepositorySource } from "./event.repository.util";

/**
 * Reactive mirror of the event repository source ("local" | "remote").
 *
 * `getEventRepositorySource` reads non-reactive module state (Google/auth/backend
 * flags), so it cannot drive TanStack Query keys on its own. This store recomputes
 * the source on demand and notifies `useSyncExternalStore` subscribers, so query
 * hooks re-key (and thus refetch from the correct source) when auth state flips.
 *
 * `refreshEventRepositorySource` must be called at every source transition; the
 * remembered session flag lets callers that don't know the session state (e.g.
 * `markBackendUnavailable`) recompute without passing one.
 *
 * Related: docs/frontend/frontend-runtime-flow.md
 */
let lastSessionExists = false;
let hasComputed = false;

// Seeded with a placeholder; the real source is computed lazily on first use.
// Computing at module-init would deadlock: backend-unavailable-error.util imports
// this module, so evaluating getEventRepositorySource here reads that module's
// availability flag before it finishes initializing (temporal dead zone).
const sourceStore = createExternalStore<EventRepositorySource>("local");

/**
 * Recompute the repository source and notify subscribers.
 * @param sessionExists Optional session flag; defaults to the last remembered value.
 */
export function refreshEventRepositorySource(sessionExists?: boolean): void {
  if (sessionExists !== undefined) {
    lastSessionExists = sessionExists;
  }

  hasComputed = true;
  sourceStore.set(getEventRepositorySource(lastSessionExists));
}

/**
 * React hook: subscribe to the current event repository source.
 */
export function useEventRepositorySource(): EventRepositorySource {
  // Compute the real source on first use (see note on lazy init above).
  if (!hasComputed) {
    refreshEventRepositorySource();
  }

  return useSyncExternalStore(sourceStore.subscribe, sourceStore.get);
}
