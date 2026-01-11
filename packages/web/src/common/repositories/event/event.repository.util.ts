import { hasUserEverAuthenticated } from "@web/common/utils/storage/auth-state.util";
import { EventRepository } from "./event.repository.interface";
import { LocalEventRepository } from "./local.event.repository";
import { RemoteEventRepository } from "./remote.event.repository";

/**
 * Factory function to get the appropriate event repository based on session and authentication state.
 *
 * Repository selection logic:
 * 1. If user has EVER authenticated: Always use RemoteEventRepository
 *    - This prevents the UX issue where events disappear after login due to cleared IndexedDB
 *    - Even if session is temporarily invalid, we use remote (user will be prompted to re-auth)
 * 2. If user has NEVER authenticated: Use LocalEventRepository (IndexedDB)
 *    - Events stored locally until user decides to sign in
 *
 * @param sessionExists - Whether a session currently exists (from session.doesSessionExist())
 */
export function getEventRepository(sessionExists: boolean): EventRepository {
  const hasAuthenticated = hasUserEverAuthenticated();

  console.log("[Repository] Selection criteria:", {
    sessionExists,
    hasAuthenticated,
  });

  // Once a user has authenticated, ALWAYS use remote repository
  // This ensures events don't disappear due to empty IndexedDB after login
  if (hasAuthenticated) {
    console.log(
      "[Repository] Using RemoteEventRepository (user has authenticated)",
    );
    return new RemoteEventRepository();
  }

  // User has never authenticated - use session state to decide
  if (sessionExists) {
    console.log("[Repository] Using RemoteEventRepository (session exists)");
    return new RemoteEventRepository();
  }

  console.log("[Repository] Using LocalEventRepository (no auth, no session)");
  return new LocalEventRepository();
}
