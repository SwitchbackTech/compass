import {
  type Credentials,
  OAuth2Client,
  type TokenPayload,
} from "google-auth-library";
import { ProviderAccountFactsSchema } from "@core/types/sync/connection.contracts";
import { GOOGLE_SCOPES } from "@sync/providers/google/google.scopes";
import {
  type ProviderAuthAdapter,
  ProviderAuthError,
  type ProviderAuthorization,
} from "@sync/providers/provider-auth.port";

// The subset of google-auth-library's OAuth2Client the adapter uses. Depending
// on an interface (not the concrete client) lets tests supply a plain fake
// without mocking the module or reaching across the network.
export interface GoogleOAuthClient {
  generateAuthUrl(options: {
    access_type: string;
    prompt?: string;
    scope: string[];
    state?: string;
    include_granted_scopes?: boolean;
  }): string;
  getToken(code: string): Promise<{ tokens: Credentials }>;
  verifyIdToken(options: { idToken: string; audience: string }): Promise<{
    getPayload(): TokenPayload | undefined;
  }>;
}

export type GoogleOAuthClientFactory = (
  redirectUri: string,
) => GoogleOAuthClient;

// Google implementation of the provider authorization port. Identity is the
// verified id-token `sub` — never the email, which is mutable and reassignable.
export class GoogleAuthAdapter implements ProviderAuthAdapter {
  readonly provider = "google" as const;

  #clientId: string;
  #makeClient: GoogleOAuthClientFactory;

  constructor(
    clientId: string,
    clientSecret: string,
    makeClient: GoogleOAuthClientFactory = (redirectUri) =>
      new OAuth2Client(clientId, clientSecret, redirectUri),
  ) {
    if (!clientId || !clientSecret) {
      throw new Error(
        "GoogleAuthAdapter requires a Google client id and secret",
      );
    }
    this.#clientId = clientId;
    this.#makeClient = makeClient;
  }

  buildAuthorizationUrl(input: { state: string; redirectUri: string }): string {
    return this.#makeClient(input.redirectUri).generateAuthUrl({
      // offline + consent guarantees a refresh token even on re-authorization,
      // which Google otherwise omits after the first consent.
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: [...GOOGLE_SCOPES],
      state: input.state,
    });
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<ProviderAuthorization> {
    const client = this.#makeClient(input.redirectUri);

    let tokens: Credentials;
    try {
      ({ tokens } = await client.getToken(input.code));
    } catch (error) {
      throw new ProviderAuthError(
        "exchangeFailed",
        "Google rejected the authorization code exchange",
        { cause: redactedCause(error) },
      );
    }

    if (!tokens.refresh_token) {
      throw new ProviderAuthError(
        "missingRefreshToken",
        "Google returned no refresh token; re-consent is required",
      );
    }
    if (!tokens.id_token) {
      throw new ProviderAuthError(
        "invalidIdToken",
        "Google returned no id token to identify the account",
      );
    }

    const payload = await this.verifyIdToken(client, tokens.id_token);
    if (!payload.sub) {
      throw new ProviderAuthError(
        "missingIdentity",
        "Google id token carried no subject to identify the account",
      );
    }

    // Parse through the shared contract so the branded id and nullable-field
    // invariants hold at the boundary; empty strings normalize to null.
    const account = ProviderAccountFactsSchema.parse({
      providerAccountId: payload.sub,
      email: payload.email || null,
      displayName: payload.name || null,
    });

    return {
      account,
      refreshToken: tokens.refresh_token,
      grantedScopes: parseGrantedScopes(tokens.scope),
    };
  }

  private async verifyIdToken(
    client: GoogleOAuthClient,
    idToken: string,
  ): Promise<TokenPayload> {
    let payload: TokenPayload | undefined;
    try {
      const ticket = await client.verifyIdToken({
        idToken,
        audience: this.#clientId,
      });
      payload = ticket.getPayload();
    } catch (error) {
      throw new ProviderAuthError(
        "invalidIdToken",
        "Google id token failed verification",
        { cause: redactedCause(error) },
      );
    }
    if (!payload) {
      throw new ProviderAuthError(
        "invalidIdToken",
        "Google id token verification returned no payload",
      );
    }
    return payload;
  }
}

// Reduce a provider-SDK error to a bare message before attaching it as a
// cause. The google-auth-library/gaxios error retains the full token-exchange
// request config, which includes the app's `client_secret` and the auth code;
// propagating the raw object would leak that secret the moment any caller logs
// the cause chain. The message is built from the response, not the request, so
// it is safe to keep for diagnostics.
function redactedCause(error: unknown): Error | undefined {
  return error instanceof Error ? new Error(error.message) : undefined;
}

// Google returns granted scopes as a single space-delimited string. A subset of
// the requested scopes is normal; callers derive capabilities from what is here.
function parseGrantedScopes(scope: string | null | undefined): string[] {
  if (!scope) return [];
  return scope.split(/\s+/).filter(Boolean);
}
