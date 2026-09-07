import { ProviderNotificationError } from "@sync/providers/provider-notifications.port";

// The HTTP-status-to-reason mapping Google and Microsoft watch adapters agreed
// on. Each grew its own copy of the same tree (401, unsupported, transient,
// otherwise durable), so a fix to one silently missed the other.
//
// Only four things genuinely differ per provider: how to read an HTTP status,
// how to build the redacted `cause`, which errors mean "this resource cannot
// be watched", and the four messages that name the provider. Provider-specific
// unsupported predicates (Google's pushNotSupported reason, Graph
// ExtensionError) stay in that adapter and are checked through this table.
export interface ProviderWatchErrorPolicy {
  // Reads the HTTP status off the provider client's thrown error. Undefined
  // means no response reached us, which the table reads as transient.
  status(error: unknown): number | undefined;
  // Builds the error's `cause`, already stripped of request-derived fields
  // (a client config carries the bearer token).
  cause(error: unknown): Error | undefined;
  isTransient(error: unknown, status: number | undefined): boolean;
  isWatchUnsupported(error: unknown): boolean;
  // Names the provider on a rejected credential, e.g. "Google rejected the
  // credential". Kept verbatim rather than composed; these strings reach
  // operators in logs.
  readonly credentialRejectedMessage: string;
  readonly watchUnsupportedMessage: string;
  readonly transientUnavailableMessage: string;
  readonly watchFailedMessage: string;
}

function withDetail(base: string, detail: string | undefined): string {
  return detail ? `${base} (${detail})` : base;
}

export function classifyProviderWatchError(
  error: unknown,
  policy: ProviderWatchErrorPolicy,
): ProviderNotificationError {
  if (error instanceof ProviderNotificationError) return error;

  const cause = policy.cause(error);
  const status = policy.status(error);
  const detail = cause?.message;

  if (status === 401) {
    return new ProviderNotificationError(
      "authorizationRevoked",
      detail ?? policy.credentialRejectedMessage,
      { cause },
    );
  }
  if (policy.isWatchUnsupported(error)) {
    return new ProviderNotificationError(
      "watchUnsupported",
      detail ?? policy.watchUnsupportedMessage,
      { cause },
    );
  }
  // Everything not transient is a durable refusal (403/404/other 4xx):
  // settle and poll.
  if (policy.isTransient(error, status)) {
    return new ProviderNotificationError(
      "transient",
      withDetail(policy.transientUnavailableMessage, detail),
      { cause },
    );
  }
  return new ProviderNotificationError(
    "watchFailed",
    withDetail(policy.watchFailedMessage, detail),
    { cause },
  );
}
