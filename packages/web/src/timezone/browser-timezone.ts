/** Browser IANA zone (e.g. "America/Chicago"). Isolated so the store can read it without importing date utils that depend on the store. */
export function getBrowserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
