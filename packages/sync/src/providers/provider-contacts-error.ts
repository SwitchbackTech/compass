import { ContactsSearchError } from "@sync/providers/provider-contacts.port";

// The HTTP-status-to-reason mapping every ContactsPort adapter agreed on.
// Google and Microsoft each grew their own copy as they were added, so a fix
// to one (or a new reason) silently missed the other.
//
// Only four things genuinely differ per provider: how to read an HTTP status,
// how to build the redacted `cause`, which errors mean "throttled" (Google
// also treats quota-shaped 403 reasons as rate limits), and the two messages
// that name the provider. The shared "Contact search failed" fallback is the
// same sentence on every adapter.
export interface ProviderContactsErrorPolicy {
  // Reads the HTTP status off the provider client's thrown error.
  status(error: unknown): number | undefined;
  // Builds the error's `cause`, already stripped of request-derived fields
  // (a client config carries the bearer token).
  cause(error: unknown): Error | undefined;
  isRateLimited(error: unknown, status: number | undefined): boolean;
  // Names the provider on a throttle, e.g. "Google throttled the contact
  // search". Kept verbatim rather than composed; these strings reach
  // operators in logs.
  readonly rateLimitedMessage: string;
  readonly unauthorizedMessage: string;
}

export function classifyContactsSearchError(
  error: unknown,
  policy: ProviderContactsErrorPolicy,
): ContactsSearchError {
  const status = policy.status(error);
  const cause = policy.cause(error);

  if (policy.isRateLimited(error, status)) {
    return new ContactsSearchError("rateLimited", policy.rateLimitedMessage, {
      cause,
    });
  }
  if (status === 401 || status === 403) {
    return new ContactsSearchError("unauthorized", policy.unauthorizedMessage, {
      cause,
    });
  }
  return new ContactsSearchError("searchFailed", "Contact search failed", {
    cause,
  });
}
