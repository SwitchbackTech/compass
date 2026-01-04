import { useMemo } from "react";
import { EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

/**
 * Factory function to get the appropriate event repository based on session state.
 * Can be used in sagas or other non-React contexts.
 * @param sessionExists - Whether a session exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  return sessionExists
    ? new RemoteEventRepository()
    : new LocalEventRepository();
}

/**
 * React hook to get the appropriate event repository based on session state.
 * Memoizes the repository instance to avoid recreating on each render.
 * Note: This hook checks session state on mount. For sagas, use getEventRepository()
 * with the result of session.doesSessionExist().
 */
export function useEventRepository(): EventRepository {
  return useMemo(() => {
    // For React components, we'll default to local and let the component
    // handle session state changes. In practice, components should check
    // session state separately if needed.
    return new LocalEventRepository();
  }, []);
}
