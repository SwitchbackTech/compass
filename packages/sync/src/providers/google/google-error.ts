import { redactedCause } from "@sync/safety/redact-error";

// Shared triage primitives for googleapis/gaxios failures, used by the read,
// discovery, and watch paths (the writer keeps its own narrower 403 set).

// The HTTP status of a googleapis/gaxios error, from the response or the error
// code. Reading it does not touch the request. Undefined means no HTTP
// response reached us (a network failure), which classifies as transient.
export function googleStatus(error: unknown): number | undefined {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    (error as { code?: number })?.code;
  return typeof status === "number" ? status : undefined;
}

// Google's machine-readable reasons for a failed call (e.g. "notFound",
// "rateLimitExceeded"), from the standard error body; googleapis may put the
// errors array on the response body OR on the error object itself — check
// both. Response-derived only.
export function googleErrorReasons(error: unknown): string[] {
  const fromBody = (
    error as {
      response?: {
        data?: { error?: { errors?: Array<{ reason?: unknown }> } };
      };
    }
  )?.response?.data?.error?.errors;
  const fromError = (error as { errors?: Array<{ reason?: unknown }> })?.errors;
  const reasons: string[] = [];
  for (const entry of [...(fromBody ?? []), ...(fromError ?? [])]) {
    if (typeof entry?.reason === "string") reasons.push(entry.reason);
  }
  return reasons;
}

// Reasons Google's 403 can carry for a quota/rate problem rather than a
// genuine permission refusal — status alone cannot tell them apart. Without
// this, a momentary quota blip would settle a job to polling (or a durable
// failure) instead of retrying.
export const GOOGLE_TRANSIENT_REASONS = [
  "rateLimitExceeded",
  "userRateLimitExceeded",
  "quotaExceeded",
  "dailyLimitExceeded",
  "backendError",
  "internalError",
];

// 429 / 5xx / no HTTP response, plus Google's 403-shaped rate-limit and quota
// reasons, are the only cases worth burning retries on. Everything else is a
// durable refusal.
export function isGoogleTransient(
  error: unknown,
  status: number | undefined = googleStatus(error),
): boolean {
  if (status === undefined || status === 429 || status >= 500) return true;
  return googleErrorReasons(error).some((reason) =>
    GOOGLE_TRANSIENT_REASONS.includes(reason),
  );
}

// Like redactedCause: drop request-derived fields (the gaxios config carries
// the bearer token), but keep the two response facts triage needs — numeric
// HTTP status and Google's machine-readable reason. Without them a durable
// failure is guesswork to diagnose from logs (2026-07-30 prod triage;
// 2026-08-07: 78 subscriptionMaintain exceptions with no status/reason).
export function googleFailureCause(error: unknown): Error | undefined {
  const status = googleStatus(error);
  const reason = googleErrorReasons(error)[0];
  const facts = [
    ...(status === undefined ? [] : [`HTTP ${status}`]),
    ...(reason === undefined ? [] : [`reason ${reason}`]),
  ];
  // Nothing response-derived to add (a bare network failure): fall back to
  // the plain redacted message.
  if (facts.length === 0) return redactedCause(error);
  const message = error instanceof Error ? error.message : null;
  return new Error(
    message ? `${message} (${facts.join(", ")})` : facts.join(", "),
  );
}
