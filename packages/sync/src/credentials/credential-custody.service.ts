import { type ConnectionId } from "@core/types/sync/identity.contracts";
import {
  type ProviderAuthAdapter,
  ProviderAuthError,
} from "@sync/providers/provider-auth.port";
import {
  type CredentialRecord,
  type CredentialUpsert,
} from "@sync/storage/credential.record";
import { type CredentialRepository } from "@sync/storage/credential.repository";

// Refresh a cached access token this many ms before its stated expiry, to
// absorb clock skew and request latency rather than serving a token that
// expires in flight.
const DEFAULT_REFRESH_SKEW_MS = 60_000;

// Owns the credential lifecycle for one provider: store the durable refresh
// token, serve valid access tokens (refreshing on demand), and revoke + delete
// on disconnect. It is the only component that touches raw credentials, and it
// never logs their values.
export class CredentialCustody {
  // In-process coalescing: concurrent access-token requests for the same
  // connection share a single refresh instead of each hitting the provider.
  // Cross-replica refreshes are NOT coalesced — Google tolerates concurrent
  // refresh-token use, so this only de-duplicates within a process.
  readonly #inflight = new Map<ConnectionId, Promise<string>>();

  constructor(
    private readonly credentials: CredentialRepository,
    private readonly adapter: ProviderAuthAdapter,
    private readonly now: () => Date = () => new Date(),
    private readonly refreshSkewMs: number = DEFAULT_REFRESH_SKEW_MS,
  ) {}

  // Persist a freshly authorized credential (or replace an existing one).
  async store(input: CredentialUpsert): Promise<CredentialRecord> {
    return this.credentials.store(input);
  }

  // Return a currently-valid access token for the connection, refreshing from
  // the stored refresh token when the cached one is absent or near expiry.
  // Rejects with a ProviderAuthError: `missingRefreshToken` if no credential
  // exists, or `authorizationRevoked` if the refresh token is no longer valid.
  getValidAccessToken(connectionId: ConnectionId): Promise<string> {
    // No `await` between the get and set, so a concurrent caller always sees
    // the in-flight promise instead of starting a second refresh.
    const inflight = this.#inflight.get(connectionId);
    if (inflight) return inflight;

    const resolved = this.#resolveAccessToken(connectionId).finally(() => {
      this.#inflight.delete(connectionId);
    });
    this.#inflight.set(connectionId, resolved);
    return resolved;
  }

  // Delete the stored credential and best-effort revoke it at the provider.
  // The delete happens regardless of whether revocation succeeds, so a broken
  // provider endpoint can never leave a credential stranded.
  async disconnect(connectionId: ConnectionId): Promise<void> {
    const credential = await this.credentials.findByConnection(connectionId);
    await this.credentials.deleteByConnection(connectionId);
    if (credential) {
      await this.adapter.revoke({ token: credential.refreshToken });
    }
  }

  async #resolveAccessToken(connectionId: ConnectionId): Promise<string> {
    const credential = await this.credentials.findByConnection(connectionId);
    if (!credential) {
      throw new ProviderAuthError(
        "missingRefreshToken",
        "No stored credential for this connection",
      );
    }

    if (
      credential.accessToken &&
      credential.accessTokenExpiresAt &&
      !this.#isExpiring(credential.accessTokenExpiresAt)
    ) {
      return credential.accessToken;
    }

    // Let a ProviderAuthError (authorizationRevoked / refreshFailed) propagate:
    // the caller maps revoked authority to an action-required connection state.
    const refreshed = await this.adapter.refreshAccessToken({
      refreshToken: credential.refreshToken,
    });
    await this.credentials.cacheAccessToken(
      connectionId,
      refreshed.accessToken,
      refreshed.expiresAt,
    );
    return refreshed.accessToken;
  }

  #isExpiring(expiresAt: Date): boolean {
    return expiresAt.getTime() - this.now().getTime() <= this.refreshSkewMs;
  }
}
