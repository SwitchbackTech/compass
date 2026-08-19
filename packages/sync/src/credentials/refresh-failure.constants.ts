// Consecutive token-endpoint failures that look transient (5xx / network)
// before we treat the grant as expired and stop burning the retry ladder.
// A genuine Google outage should recover before this; a misclassified revoke
// must not retry 20 times with a dead refresh token (2026-08 incremental 401s).
export const MAX_REFRESH_FAILED_ATTEMPTS = 3;
