const UTC_LIKE_TIME_ZONES = new Set(["UTC", "Etc/UTC", "Etc/GMT", "GMT"]);

/** True for zones that render as the UTC grid label (parity harness uses these). */
export function isUtcLikeTimeZone(timeZone: string): boolean {
  return UTC_LIKE_TIME_ZONES.has(timeZone);
}

/** Brave and other browsers may spoof the device zone to UTC under fingerprinting. */
export function isTrustedDeviceTimeZone(timeZone: string): boolean {
  return !isUtcLikeTimeZone(timeZone);
}
