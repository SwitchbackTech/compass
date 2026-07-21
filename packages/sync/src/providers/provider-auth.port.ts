import { type ProviderAccountFacts } from "@core/types/sync/connection.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";

// The durable result of authorizing one provider account. It is the minimum a
// caller needs to persist a connection: a stable, provider-assigned identity
// (never email), the credential to store, and the scopes actually granted.
export interface ProviderAuthorization {
  // Stable account facts keyed on the provider's own account id (e.g. Google's
  // `sub`). Identity is never inferred from email.
  readonly account: ProviderAccountFacts;
  // The long-lived credential to persist. Short-lived access tokens are minted
  // on demand from this and are never stored.
  readonly refreshToken: string;
  // The scopes the user actually granted, which may be a subset of those
  // requested. Callers derive capabilities from these rather than assuming.
  readonly grantedScopes: readonly string[];
}

// A freshly minted short-lived access token and its absolute expiry. Callers
// cache this against the durable refresh token and re-mint it when it expires.
export interface RefreshedCredential {
  readonly accessToken: string;
  readonly expiresAt: Date;
  // Scopes the provider reports for the refreshed token (may narrow over time).
  readonly grantedScopes: readonly string[];
}

// A provider-neutral authorization port. The domain builds a consent URL and
// exchanges the returned code without knowing which provider it is talking to;
// provider-specific detail (endpoints, id-token verification, idempotency)
// stays inside the adapter.
export interface ProviderAuthAdapter {
  readonly provider: ProviderKind;

  // Build the URL to send the user to for consent. `state` is opaque here and
  // is validated by the caller when the provider redirects back.
  buildAuthorizationUrl(input: {
    readonly state: string;
    readonly redirectUri: string;
  }): string;

  // Exchange an authorization code for durable credentials and account
  // identity. The `redirectUri` must match the one used to build the URL.
  // Rejects with a ProviderAuthError when the grant is unusable.
  exchangeAuthorizationCode(input: {
    readonly code: string;
    readonly redirectUri: string;
  }): Promise<ProviderAuthorization>;

  // Mint a fresh access token from a stored refresh token. Rejects with a
  // ProviderAuthError whose reason is `authorizationRevoked` when the provider
  // reports the grant is no longer valid, so the caller can move the connection
  // to an action-required state instead of retrying forever.
  refreshAccessToken(input: {
    readonly refreshToken: string;
  }): Promise<RefreshedCredential>;

  // Best-effort revocation of a token at the provider. Never rejects: a failed
  // revoke must not block deleting the stored credential on disconnect.
  revoke(input: { readonly token: string }): Promise<void>;
}

// Why an authorization attempt could not yield a usable connection. Callers map
// these to connection states (e.g. a missing refresh token is a credential
// problem the user must act on) instead of parsing provider error strings.
export type ProviderAuthErrorReason =
  | "exchangeFailed" // the provider rejected the code exchange
  | "missingRefreshToken" // no refresh token returned (e.g. prior consent)
  | "missingIdentity" // the account could not be identified from the grant
  | "invalidIdToken" // the id token was absent or failed verification
  | "authorizationRevoked" // the refresh token is no longer valid (revoked/expired)
  | "refreshFailed"; // the token refresh failed for a transient/unknown reason

export class ProviderAuthError extends Error {
  constructor(
    readonly reason: ProviderAuthErrorReason,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "ProviderAuthError";
  }
}
