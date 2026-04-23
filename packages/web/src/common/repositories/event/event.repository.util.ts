/**
 * Repository selection entry point.
 * This factory decides whether event reads/writes go to local IndexedDB or the remote API.
 * Google connection state, remembered auth state, and current session state decide the target.
 * Never call this directly from components; always go through sagas.
 * Start debugging "why isn't this event saving?" here.
 * Related: docs/development/web-state-guide.md
 */
import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
import { isGoogleRevoked } from "@web/auth/google/state/google.auth.state";
import { type EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

/**
 * Factory function to get the appropriate event repository based on session and authentication state.
 *
 * Repository selection logic:
 * 1. If Google disconnected Compass: Use LocalEventRepository
 *    - Graceful degradation until user re-authenticates
 *    - Prevents API errors from failed Google token refresh
 * 2. If user has EVER authenticated: Use RemoteEventRepository
 *    - Prevents remote account events from disappearing when the session is temporarily missing
 *    - Remote requests can surface the auth problem instead of silently saving locally
 * 3. If a session exists: Use RemoteEventRepository
 *    - Newly authenticated users persist through the backend even before remembered auth state updates
 * 4. If user has NEVER authenticated: Use LocalEventRepository (IndexedDB)
 *    - Events stored locally until user decides to sign in
 *
 * @param sessionExists - Whether a session currently exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  // If Google disconnected Compass, use local storage until user re-authenticates
  if (isGoogleRevoked()) {
    return new LocalEventRepository();
  }

  if (hasUserEverAuthenticated()) {
    return new RemoteEventRepository();
  }

  if (sessionExists) {
    return new RemoteEventRepository();
  }

  return new LocalEventRepository();
}
