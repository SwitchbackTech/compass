/**
 * In-memory state for Google authentication status.
 * Tracks revocation state that doesn't need to persist across page refreshes.
 */

import { clearAllGoogleReconnectRequired } from "./google.reconnect.state";

/**
 * Legacy in-memory flag for a global Google-revoked session. New reconnect UX
 * uses per-account overrides in {@link google.reconnect.state}; this flag remains
 * only for a few anonymous-write helpers and is no longer used to force the
 * whole app onto LocalEventRepository.
 */
let isGoogleRevokedInSession = false;

/**
 * Marks that Google access has been revoked in this session.
 *
 * Prefer {@link markAccountReconnectRequired} for multi-account reconnect UX.
 * This global flag must not demote healthy accounts to local storage.
 */
export function markGoogleAsRevoked(): void {
  isGoogleRevokedInSession = true;
}

/**
 * Clears the Google revoked state and per-account reconnect overrides.
 * Called when user successfully re-authenticates with Google.
 */
export function clearGoogleRevokedState(): void {
  isGoogleRevokedInSession = false;
  clearAllGoogleReconnectRequired();
}

/**
 * Checks if Google access has been revoked in this session.
 *
 * @returns true if the legacy global revoked flag is set
 */
export function isGoogleRevoked(): boolean {
  return isGoogleRevokedInSession;
}
