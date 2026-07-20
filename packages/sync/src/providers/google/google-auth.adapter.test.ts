import { type Credentials, type TokenPayload } from "google-auth-library";
import { GOOGLE_SCOPES } from "@sync/providers/google/google.scopes";
import {
  GoogleAuthAdapter,
  type GoogleOAuthClient,
} from "@sync/providers/google/google-auth.adapter";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";

// A plain fake standing in for google-auth-library's OAuth2Client. Injected via
// the adapter's client factory so no module mocking or network call is needed.
class FakeGoogleClient implements GoogleOAuthClient {
  authUrlOptions: Parameters<GoogleOAuthClient["generateAuthUrl"]>[0][] = [];

  constructor(
    private readonly behavior: {
      tokens?: Credentials;
      getTokenError?: unknown;
      payload?: TokenPayload;
      verifyError?: unknown;
    } = {},
  ) {}

  generateAuthUrl(
    options: Parameters<GoogleOAuthClient["generateAuthUrl"]>[0],
  ): string {
    this.authUrlOptions.push(options);
    const scope = encodeURIComponent(options.scope.join(" "));
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${options.state}&scope=${scope}`;
  }

  async getToken(_code: string): Promise<{ tokens: Credentials }> {
    if (this.behavior.getTokenError) throw this.behavior.getTokenError;
    return { tokens: this.behavior.tokens ?? {} };
  }

  async verifyIdToken(_options: {
    idToken: string;
    audience: string;
  }): Promise<{ getPayload(): TokenPayload | undefined }> {
    if (this.behavior.verifyError) throw this.behavior.verifyError;
    return { getPayload: () => this.behavior.payload };
  }
}

const CLIENT_ID = "client-id.apps.googleusercontent.com";
const CLIENT_SECRET = "client-secret";

function makePayload(overrides: Partial<TokenPayload> = {}): TokenPayload {
  return {
    iss: "https://accounts.google.com",
    aud: CLIENT_ID,
    iat: 0,
    exp: 0,
    sub: "google-subject-123",
    email: "user@example.com",
    name: "Ada Lovelace",
    ...overrides,
  };
}

// Build an adapter whose client factory records the redirect URIs it is asked
// for and always returns the given fake.
function adapterWith(client: FakeGoogleClient) {
  const redirectUris: string[] = [];
  const adapter = new GoogleAuthAdapter(
    CLIENT_ID,
    CLIENT_SECRET,
    (redirectUri) => {
      redirectUris.push(redirectUri);
      return client;
    },
  );
  return { adapter, redirectUris };
}

describe("GoogleAuthAdapter", () => {
  it("identifies as the google provider", () => {
    const { adapter } = adapterWith(new FakeGoogleClient());
    expect(adapter.provider).toBe("google");
  });

  it("refuses to construct without a client id and secret", () => {
    expect(() => new GoogleAuthAdapter("", CLIENT_SECRET)).toThrow(
      /client id and secret/,
    );
    expect(() => new GoogleAuthAdapter(CLIENT_ID, "")).toThrow(
      /client id and secret/,
    );
  });

  describe("buildAuthorizationUrl", () => {
    it("requests offline access and consent for every configured scope", () => {
      const client = new FakeGoogleClient();
      const { adapter, redirectUris } = adapterWith(client);

      const url = adapter.buildAuthorizationUrl({
        state: "opaque-state",
        redirectUri: "https://staging.example.com/sync/google",
      });

      // The redirect URI is passed through to the client that mints the URL.
      expect(redirectUris).toEqual(["https://staging.example.com/sync/google"]);
      const options = client.authUrlOptions[0];
      expect(options.access_type).toBe("offline");
      expect(options.prompt).toBe("consent");
      expect(options.state).toBe("opaque-state");
      expect(options.scope).toEqual([...GOOGLE_SCOPES]);
      expect(url).toContain("state=opaque-state");
    });
  });

  describe("exchangeAuthorizationCode", () => {
    const validTokens: Credentials = {
      refresh_token: "refresh-token-value",
      access_token: "access-token-value",
      id_token: "id-token-value",
      scope:
        "https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/calendar.readonly",
    };

    it("returns sub-keyed identity, the refresh token, and granted scopes", async () => {
      const client = new FakeGoogleClient({
        tokens: validTokens,
        payload: makePayload(),
      });
      const { adapter, redirectUris } = adapterWith(client);

      const result = await adapter.exchangeAuthorizationCode({
        code: "auth-code",
        redirectUri: "https://staging.example.com/sync/google",
      });

      expect(result.account.providerAccountId).toBe("google-subject-123");
      expect(result.account.email).toBe("user@example.com");
      expect(result.account.displayName).toBe("Ada Lovelace");
      expect(result.refreshToken).toBe("refresh-token-value");
      expect(result.grantedScopes).toEqual([
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/calendar.readonly",
      ]);
      expect(redirectUris).toEqual(["https://staging.example.com/sync/google"]);
    });

    it("preserves identity when the account email changes (keyed on sub)", async () => {
      const first = await adapterWith(
        new FakeGoogleClient({ tokens: validTokens, payload: makePayload() }),
      ).adapter.exchangeAuthorizationCode({
        code: "code-1",
        redirectUri: "https://x/sync/google",
      });

      const second = await adapterWith(
        new FakeGoogleClient({
          tokens: { ...validTokens, refresh_token: "rotated-refresh" },
          payload: makePayload({ email: "renamed@example.com" }),
        }),
      ).adapter.exchangeAuthorizationCode({
        code: "code-2",
        redirectUri: "https://x/sync/google",
      });

      // Same Google account -> same stable id, even though email + token moved.
      expect(second.account.providerAccountId).toBe(
        first.account.providerAccountId,
      );
      expect(second.account.email).toBe("renamed@example.com");
      expect(second.refreshToken).toBe("rotated-refresh");
    });

    it("normalizes an absent email or name to null", async () => {
      const client = new FakeGoogleClient({
        tokens: validTokens,
        payload: makePayload({ email: undefined, name: undefined }),
      });
      const { adapter } = adapterWith(client);

      const result = await adapter.exchangeAuthorizationCode({
        code: "auth-code",
        redirectUri: "https://x/sync/google",
      });

      expect(result.account.providerAccountId).toBe("google-subject-123");
      expect(result.account.email).toBeNull();
      expect(result.account.displayName).toBeNull();
    });

    it("treats a failed code exchange as exchangeFailed", async () => {
      const client = new FakeGoogleClient({
        getTokenError: new Error("invalid_grant"),
      });
      const { adapter } = adapterWith(client);

      const error = await adapter
        .exchangeAuthorizationCode({
          code: "bad-code",
          redirectUri: "https://x/sync/google",
        })
        .catch((e) => e);

      expect(error).toBeInstanceOf(ProviderAuthError);
      expect((error as ProviderAuthError).reason).toBe("exchangeFailed");
    });

    it("requires a refresh token", async () => {
      const client = new FakeGoogleClient({
        tokens: { ...validTokens, refresh_token: undefined },
        payload: makePayload(),
      });
      const { adapter } = adapterWith(client);

      const error = await adapter
        .exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://x/sync/google",
        })
        .catch((e) => e);

      expect((error as ProviderAuthError).reason).toBe("missingRefreshToken");
    });

    it("requires an id token to identify the account", async () => {
      const client = new FakeGoogleClient({
        tokens: { ...validTokens, id_token: undefined },
        payload: makePayload(),
      });
      const { adapter } = adapterWith(client);

      const error = await adapter
        .exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://x/sync/google",
        })
        .catch((e) => e);

      expect((error as ProviderAuthError).reason).toBe("invalidIdToken");
    });

    it("treats a failed id-token verification as invalidIdToken", async () => {
      const client = new FakeGoogleClient({
        tokens: validTokens,
        verifyError: new Error("Wrong recipient"),
      });
      const { adapter } = adapterWith(client);

      const error = await adapter
        .exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://x/sync/google",
        })
        .catch((e) => e);

      expect((error as ProviderAuthError).reason).toBe("invalidIdToken");
    });

    it("rejects a verified token that carries no subject", async () => {
      const client = new FakeGoogleClient({
        tokens: validTokens,
        payload: makePayload({ sub: "" }),
      });
      const { adapter } = adapterWith(client);

      const error = await adapter
        .exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://x/sync/google",
        })
        .catch((e) => e);

      expect((error as ProviderAuthError).reason).toBe("missingIdentity");
    });

    it("returns no granted scopes when the provider omits them", async () => {
      const client = new FakeGoogleClient({
        tokens: { ...validTokens, scope: undefined },
        payload: makePayload(),
      });
      const { adapter } = adapterWith(client);

      const result = await adapter.exchangeAuthorizationCode({
        code: "auth-code",
        redirectUri: "https://x/sync/google",
      });

      expect(result.grantedScopes).toEqual([]);
    });
  });
});
