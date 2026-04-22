/**
 * Repository selection entry point.
 * This factory decides whether event reads/writes go to local IndexedDB or the remote API.
 * Auth state is the source of truth — authenticated users prefer remote.
 * Never call this directly from components; always go through sagas.
 * Start debugging "why isn't this event saving?" here.
 * Related: docs/development/web-state-guide.md
 */
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { type EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

/**
 * Factory function to get the appropriate event repository based on session and authentication state.
 *
 * Repository selection logic:
 * 1. If Google access was revoked: Use LocalEventRepository
 *    - Graceful degradation until user re-authenticates
 *    - Prevents API errors from failed Google token refresh
 * 2. If no session exists: Use LocalEventRepository (IndexedDB)
 *    - Stale auth flags can outlive backend sessions, especially across local/self-host installs
 *    - Local storage keeps anonymous event creation working instead of failing with 401s
 * 3. If a session exists: Use RemoteEventRepository
 *    - Authenticated users persist through the backend
 *
 * @param sessionExists - Whether a session currently exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  // If Google was revoked, use local storage until user re-authenticates
  if (isGoogleRevoked()) {
    return new LocalEventRepository();
  }

  if (sessionExists) {
    return new RemoteEventRepository();
  }

  return new LocalEventRepository();
}
