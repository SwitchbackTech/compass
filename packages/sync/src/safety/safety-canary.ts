/**
 * Patterns that must never appear in Sync operational logs, SSE payloads, or
 * error cause chains (R-SEC / S43). Used by tests as canaries; not a runtime
 * filter for production traffic.
 */
const SECRET_PATTERNS: readonly RegExp[] = [
  /Bearer\s+[A-Za-z0-9._~+/=-]+/i,
  /client_secret\s*=\s*\S+/i,
  /refresh_token\s*=\s*\S+/i,
  /"access_token"\s*:\s*"[^"]+"/i,
  /"refresh_token"\s*:\s*"[^"]+"/i,
];

const EVENT_CONTENT_PATTERNS: readonly RegExp[] = [
  /"title"\s*:\s*"[^"]+"/i,
  /"description"\s*:\s*"[^"]+"/i,
  /"attendees"\s*:\s*\[/i,
  /"conferenceData"\s*:/i,
  /"hangoutLink"\s*:/i,
];

export type SafetyCanaryKind = "secret" | "eventContent";

function serializeForCanary(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

/** Return the first matching canary pattern label, or null if clean. */
export function findSafetyCanaryHit(
  value: unknown,
  kinds: readonly SafetyCanaryKind[] = ["secret", "eventContent"],
): string | null {
  const text = serializeForCanary(value);
  if (kinds.includes("secret")) {
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        return `secret:${pattern.source}`;
      }
    }
  }
  if (kinds.includes("eventContent")) {
    for (const pattern of EVENT_CONTENT_PATTERNS) {
      if (pattern.test(text)) {
        return `eventContent:${pattern.source}`;
      }
    }
  }
  return null;
}

/** Assert a value is free of credential / event-content shaped strings. */
export function assertNoSafetyCanary(
  value: unknown,
  kinds?: readonly SafetyCanaryKind[],
): void {
  const hit = findSafetyCanaryHit(value, kinds);
  if (hit) {
    throw new Error(`Safety canary hit: ${hit}`);
  }
}
