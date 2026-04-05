/**
 * Updates the jsdom URL via the History API so `window.location` stays consistent
 * without replacing the non-configurable `location` object.
 */
export function setTestWindowUrl(url: string): void {
  const resolved = new URL(url, "http://localhost");
  window.history.replaceState(
    {},
    "",
    `${resolved.pathname}${resolved.search}${resolved.hash}`,
  );
}
