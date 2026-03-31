/**
 * In-memory state for Google authentication status.
 * Tracks revocation state that doesn't need to persist across page refreshes.
 */

/**
 * In-memory flag for Google revocation state.
 * This is intentionally NOT persisted to localStorage because:
 * 1. After page refresh, the app will "self-correct" by detecting the 400 error
 * 2. Keeps localStorage cleaner (only persistent auth state)
 * 3. Simpler implementation with acceptable UX trade-off
 */
let isGoogleRevokedInSession = false;

/**
 * Marks that Google access has been revoked.
 * When set, the app will use LocalEventRepository instead of RemoteEventRepository
 * to prevent API errors until user re-authenticates.
 *
 * Note: This is stored in-memory only. After page refresh, the app will
 * "self-correct" by detecting a 400 error on the first API call.
 */
export function markGoogleAsRevoked(): void {
  isGoogleRevokedInSession = true;
}

/**
 * Clears the Google revoked state.
 * Called when user successfully re-authenticates with Google.
 */
export function clearGoogleRevokedState(): void {
  isGoogleRevokedInSession = false;
}

/**
 * Checks if Google access has been revoked in this session.
 * When true, the app should use LocalEventRepository instead of RemoteEventRepository.
 *
 * @returns true if Google access was revoked in this session
 */
export function isGoogleRevoked(): boolean {
  return isGoogleRevokedInSession;
}
