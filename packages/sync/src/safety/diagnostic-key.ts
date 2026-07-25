import { createHash } from "node:crypto";

// Non-user-facing connection key for logs and support lookup (R-OPS-05).
// Derived from the connection id so upserts can stamp it at insert without a
// second round-trip. Not a secret: knowing the connection id already implies
// privileged access. Do not put the raw connection id in PostHog properties.
export const DIAGNOSTIC_KEY_LENGTH = 32;

export function deriveDiagnosticKey(connectionId: string): string {
  return createHash("sha256")
    .update(`sync-connection:${connectionId}`)
    .digest("hex")
    .slice(0, DIAGNOSTIC_KEY_LENGTH);
}
