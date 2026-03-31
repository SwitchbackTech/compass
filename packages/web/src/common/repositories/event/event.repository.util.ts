import { hasUserEverAuthenticated } from "@web/auth/compass/state/auth.state.util";
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
 * 2. If user has EVER authenticated: Always use RemoteEventRepository
 *    - This prevents the UX issue where events disappear after login due to cleared IndexedDB
 *    - Even if session is temporarily invalid, we use remote (user will be prompted to re-auth)
 * 3. If user has NEVER authenticated: Use LocalEventRepository (IndexedDB)
 *    - Events stored locally until user decides to sign in
 *
 * @param sessionExists - Whether a session currently exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  // If Google was revoked, use local storage until user re-authenticates
  if (isGoogleRevoked()) {
    return new LocalEventRepository();
  }

  const hasAuthenticated = hasUserEverAuthenticated();

  // Once a user has authenticated, ALWAYS use remote repository
  // This ensures events don't disappear due to empty IndexedDB after login
  if (hasAuthenticated) {
    return new RemoteEventRepository();
  }

  // User has never authenticated - use session state to decide
  if (sessionExists) {
    return new RemoteEventRepository();
  }

  return new LocalEventRepository();
}
