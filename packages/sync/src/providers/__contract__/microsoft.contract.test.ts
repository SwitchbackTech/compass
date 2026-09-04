import { generateKeyPair, type KeyLike, SignJWT } from "jose";
import { type AuthContractCase } from "@sync/providers/__contract__/auth.contract";
import exchangeFixture from "@sync/providers/__contract__/fixtures/microsoft/exchange-success.json";
import refreshRevokedFixture from "@sync/providers/__contract__/fixtures/microsoft/refresh-invalid-grant.json";
import refreshSuccessFixture from "@sync/providers/__contract__/fixtures/microsoft/refresh-success.json";
import {
  MicrosoftAuthAdapter,
  type MicrosoftIdTokenVerifier,
  type MicrosoftTokenEndpoint,
  type MicrosoftTokenResponse,
} from "@sync/providers/microsoft/microsoft-auth.adapter";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";

const CLIENT_ID = "microsoft-client-id";
const CLIENT_SECRET = "microsoft-client-secret";

interface ExchangeSuccessFixture {
  readonly tokenResponse: MicrosoftTokenResponse;
  readonly idTokenClaims: {
    readonly oid: string;
    readonly preferred_username?: string;
    readonly email?: string;
    readonly name?: string;
  };
}

class FixtureTokenEndpoint implements MicrosoftTokenEndpoint {
  constructor(
    private readonly exchangeResponse: MicrosoftTokenResponse,
    private readonly refreshResponses: readonly MicrosoftTokenResponse[],
  ) {}

  exchangeAuthorizationCode(): Promise<MicrosoftTokenResponse> {
    return Promise.resolve(this.exchangeResponse);
  }

  refreshAccessToken(): Promise<MicrosoftTokenResponse> {
    const next = this.refreshResponses[0];
    if (!next) throw new Error("unexpected refresh call");
    return Promise.resolve(next);
  }
}

class StaticIdTokenVerifier implements MicrosoftIdTokenVerifier {
  constructor(private readonly claims: Record<string, unknown>) {}

  verify(): Promise<Record<string, unknown>> {
    return Promise.resolve(this.claims);
  }
}

async function signedIdToken(
  privateKey: KeyLike,
  claims: Record<string, unknown>,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setAudience(CLIENT_ID)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(privateKey);
}

async function buildAdapter(
  refreshResponses: readonly MicrosoftTokenResponse[] = [],
): Promise<MicrosoftAuthAdapter> {
  const fixture = exchangeFixture as ExchangeSuccessFixture;
  const { privateKey } = await generateKeyPair("RS256");
  const idToken = await signedIdToken(privateKey, fixture.idTokenClaims);
  const tokenEndpoint = new FixtureTokenEndpoint(
    { ...fixture.tokenResponse, id_token: idToken },
    refreshResponses,
  );
  return new MicrosoftAuthAdapter(
    CLIENT_ID,
    CLIENT_SECRET,
    () => tokenEndpoint,
    () => new StaticIdTokenVerifier(fixture.idTokenClaims),
  );
}

function describeAuthCases(
  kind: string,
  buildAdapter: () => Promise<MicrosoftAuthAdapter>,
  cases: readonly AuthContractCase[],
): void {
  describe(`${kind} auth contract`, () => {
    for (const testCase of cases) {
      it(testCase.name, async () => {
        const adapter = await buildAdapter();
        await testCase.run(adapter);
      });
    }
  });
}

describeAuthCases("microsoft", () => buildAdapter(), [
  {
    name: "exchange yields oid-keyed identity, a refresh token, and granted scopes",
    async run(auth) {
      const result = await auth.exchangeAuthorizationCode({
        code: "auth-code",
        redirectUri: "https://staging.example.com/sync/microsoft",
      });
      const fixture = exchangeFixture as ExchangeSuccessFixture;
      expect(result.account.providerAccountId).toBe(fixture.idTokenClaims.oid);
      expect(result.refreshToken).toBe(fixture.tokenResponse.refresh_token);
      expect(result.grantedScopes).toEqual([
        "openid",
        "profile",
        "email",
        "offline_access",
        "User.Read",
        "Calendars.ReadWrite",
      ]);
    },
  },
]);

describeAuthCases(
  "microsoft",
  () => buildAdapter([refreshSuccessFixture as MicrosoftTokenResponse]),
  [
    {
      name: "refresh mints a fresh access token and expiry",
      async run(auth) {
        const fixture = exchangeFixture as ExchangeSuccessFixture;
        await auth.exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://staging.example.com/sync/microsoft",
        });
        const refreshed = await auth.refreshAccessToken({
          refreshToken: fixture.tokenResponse.refresh_token!,
        });
        expect(refreshed.accessToken).toBe(
          (refreshSuccessFixture as MicrosoftTokenResponse).access_token,
        );
        expect(refreshed.grantedScopes).toEqual([
          "Calendars.ReadWrite",
          "User.Read",
        ]);
      },
    },
  ],
);

describeAuthCases(
  "microsoft",
  () => buildAdapter([refreshRevokedFixture as MicrosoftTokenResponse]),
  [
    {
      name: "maps invalid_grant to authorizationRevoked",
      async run(auth) {
        const fixture = exchangeFixture as ExchangeSuccessFixture;
        await auth.exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://staging.example.com/sync/microsoft",
        });
        const error = await auth
          .refreshAccessToken({
            refreshToken: fixture.tokenResponse.refresh_token!,
          })
          .catch((e) => e);
        expect(error).toBeInstanceOf(ProviderAuthError);
        expect((error as ProviderAuthError).reason).toBe(
          "authorizationRevoked",
        );
      },
    },
  ],
);
