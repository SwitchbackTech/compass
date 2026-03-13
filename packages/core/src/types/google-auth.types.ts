/**
 * @deprecated This type is transitional. Auth mode is now determined
 * server-side in handleGoogleAuth() based on refresh token presence and
 * sync health, not frontend-provided intent.
 *
 * The frontend may still send this value, but it is no longer authoritative
 * for routing auth flows. Backend determines auth mode using:
 * - User existence (via findCompassUserBy)
 * - Refresh token presence (user.google.gRefreshToken)
 * - Sync health (canDoIncrementalSync)
 */
export type GoogleAuthIntent = "connect" | "reconnect";
