import { ProviderWriteError } from "@sync/providers/provider-event-writer.port";

// The HTTP-status-to-reason mapping every provider writer agreed on. Google,
// Microsoft and Apple each grew their own copy of this table as they were
// added, so a fix to one (or a new reason) silently missed the others.
//
// Only four things genuinely differ per provider: how to read an HTTP status
// off that client's thrown error, how to build the redacted `cause`, and the
// two messages that name the provider. Anything a provider treats specially
// (Google's retryable quota 403, Apple's 507) stays in that adapter and is
// checked before this table, where it is visible next to the API it explains.
export interface ProviderWriteErrorPolicy {
  // Reads the HTTP status off the provider client's thrown error. Undefined
  // means no response reached us, which the table reads as transient.
  status(error: unknown): number | undefined;
  // Builds the error's `cause`, already stripped of request-derived fields
  // (a client config carries the bearer token).
  cause(error: unknown): Error | undefined;
  // Names the provider on a rejected credential, e.g. "Google rejected the
  // credential". Kept verbatim per provider rather than composed, because
  // Apple's reads "credentials" and these strings reach operators in logs.
  readonly credentialRejectedMessage: string;
  // Names the provider on an unclassified rejection, e.g. "Google rejected
  // the write".
  readonly writeRejectedMessage: string;
}

// 404 and 410 both mean the provider no longer holds the event. Callers treat
// this as a settled outcome (a delete of an already-deleted event succeeded),
// not a failure, so it is a predicate rather than a classified error.
export function isNotFoundStatus(status: number | undefined): boolean {
  return status === 404 || status === 410;
}

export function classifyProviderWriteError(
  error: unknown,
  policy: ProviderWriteErrorPolicy,
): ProviderWriteError {
  const status = policy.status(error);
  const cause = policy.cause(error);

  if (status === 412) {
    return new ProviderWriteError(
      "versionConflict",
      "The event was modified since the expected version",
      { cause },
    );
  }
  if (status === 401) {
    return new ProviderWriteError(
      "authorizationRevoked",
      policy.credentialRejectedMessage,
      { cause },
    );
  }
  if (status === 403) {
    return new ProviderWriteError(
      "readOnlyCalendar",
      "The calendar cannot be written",
      { cause },
    );
  }
  // No status (a network failure) or 429/5xx are transient and safe to retry.
  if (status === undefined || status === 429 || status >= 500) {
    return new ProviderWriteError("transient", "The write failed transiently", {
      cause,
    });
  }
  return new ProviderWriteError(
    "permanentProviderError",
    policy.writeRejectedMessage,
    { cause },
  );
}
