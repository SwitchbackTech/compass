/** Query keys providers append to sign-in callback URLs. */
export const OAUTH_CALLBACK_QUERY_KEYS = [
  "state",
  "code",
  "error",
  "scope",
  "user",
] as const;

export function oauthCallbackSearchParams(search: string): URLSearchParams {
  return new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
}

export function oauthCallbackSearchHasParams(search: string): boolean {
  const params = oauthCallbackSearchParams(search);
  return OAUTH_CALLBACK_QUERY_KEYS.some((key) => params.has(key));
}

/**
 * Drops provider callback query params from the address bar so a reload cannot
 * re-enter the OAuth exchange. Call after reading `location.search` into memory.
 */
export function stripOAuthCallbackQueryFromHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!oauthCallbackSearchHasParams(window.location.search)) {
    return;
  }

  const nextUrl = `${window.location.pathname}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}
