import { type ProviderKind } from "@core/types/sync/identity.contracts";

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

/** Provider-native payload shapes that must not leak into logs or SSE. */
export const PROVIDER_LEAK_MARKERS: Record<ProviderKind, readonly RegExp[]> = {
  google: [/"conferenceData"\s*:/i, /"hangoutLink"\s*:/i],
  microsoft: [/"@odata\.etag"\s*:/i, /"onlineMeeting"\s*:/i],
  apple: [/BEGIN:VEVENT/i],
};

const SHARED_EVENT_CONTENT_PATTERNS: readonly RegExp[] = [
  /"title"\s*:\s*"[^"]+"/i,
  /"description"\s*:\s*"[^"]+"/i,
  /"attendees"\s*:\s*\[/i,
  // People API shapes (WP-05 contact suggestions). A person payload or a
  // suggestion list serialized into a log/error is a contact-data leak.
  /"emailAddresses"\s*:/i,
  /"suggestions"\s*:\s*\[\s*\{/i,
];

export type SafetyCanaryKind = "secret" | "eventContent";

function serializeForCanary(value: unknown): string {
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function findProviderLeakMarkerHit(text: string): string | null {
  for (const patterns of Object.values(PROVIDER_LEAK_MARKERS)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return `eventContent:${pattern.source}`;
      }
    }
  }
  return null;
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
    const providerHit = findProviderLeakMarkerHit(text);
    if (providerHit) return providerHit;
    for (const pattern of SHARED_EVENT_CONTENT_PATTERNS) {
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
