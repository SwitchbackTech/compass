import { generateKeyPair, type KeyLike, SignJWT } from "jose";
import { defaultCorpusDir } from "@sync/providers/__contract__/adapter-contract";
import { type AuthContractCase } from "@sync/providers/__contract__/auth.contract";
import exchangeFixture from "@sync/providers/__contract__/fixtures/microsoft/exchange-success.json";
import normalizerFixture from "@sync/providers/__contract__/fixtures/microsoft/normalizer.json";
import refreshRevokedFixture from "@sync/providers/__contract__/fixtures/microsoft/refresh-invalid-grant.json";
import refreshSuccessFixture from "@sync/providers/__contract__/fixtures/microsoft/refresh-success.json";
import {
  defaultMicrosoftReaderCorpus,
  microsoftReaderMasterCategories,
  microsoftRecordedReader,
} from "@sync/providers/__contract__/microsoft-contract.factory";
import {
  MicrosoftAuthAdapter,
  type MicrosoftIdTokenVerifier,
  type MicrosoftTokenEndpoint,
  type MicrosoftTokenResponse,
} from "@sync/providers/microsoft/microsoft-auth.adapter";
import {
  type GraphEvent,
  normalizeMicrosoftEvent,
} from "@sync/providers/microsoft/microsoft-event.normalizer";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { ProviderEventError } from "@sync/providers/provider-event.port";
import {
  type ProviderEventReadError,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";

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
    requires: "oauthRedirect",
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
      requires: "oauthRedirect",
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
      requires: "oauthRedirect",
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

interface NormalizerCorpus {
  readonly timed: GraphEvent;
  readonly allDay: GraphEvent;
  readonly seriesMaster: GraphEvent;
  readonly exception: GraphEvent;
  readonly cancelledException: GraphEvent;
  readonly occurrence: GraphEvent;
  readonly attendeesAndConference: GraphEvent;
  readonly masterCategories: Record<string, string>;
}

const normalizerCorpus = normalizerFixture as NormalizerCorpus;
const masterCategories = new Map(
  Object.entries(normalizerCorpus.masterCategories),
);

describe("microsoft normalizer contract", () => {
  it("normalizes a timed event from the Graph fixture corpus", () => {
    const read = normalizeMicrosoftEvent(normalizerCorpus.timed);
    expect(read.kind).toBe("event");
    if (read.kind !== "event") return;
    expect(read.providerEventId).toBe("AAMkAGI2TG93AAA=");
    expect(read.schedule.kind).toBe("timed");
    expect(read.recurrence).toEqual({ kind: "single" });
  });

  it("normalizes an all-day free event from the Graph fixture corpus", () => {
    const read = normalizeMicrosoftEvent(normalizerCorpus.allDay);
    expect(read.kind).toBe("event");
    if (read.kind !== "event") return;
    expect(read.busy).toBe(false);
    expect(read.schedule).toEqual({
      kind: "allDay",
      start: "2022-02-22",
      end: "2022-02-23",
    });
  });

  it("normalizes a series master and exception from the Graph fixture corpus", () => {
    const master = normalizeMicrosoftEvent(normalizerCorpus.seriesMaster);
    expect(master.kind).toBe("event");
    if (master.kind !== "event") return;
    expect(master.recurrence.kind).toBe("seriesMaster");

    const exception = normalizeMicrosoftEvent(normalizerCorpus.exception);
    expect(exception.kind).toBe("event");
    if (exception.kind !== "event") return;
    expect(exception.recurrence).toEqual({
      kind: "instance",
      seriesProviderId: "AAMkAGI2TG95AAA=",
      recurrenceId: "2025-09-08T01:30:00.000Z",
    });
  });

  it("normalizes a cancelled exception from the Graph fixture corpus", () => {
    const read = normalizeMicrosoftEvent(normalizerCorpus.cancelledException);
    expect(read.kind).toBe("cancellation");
    if (read.kind !== "cancellation") return;
    expect(read.series).toEqual({
      seriesProviderId: "AAMkAGI2TG95AAA=",
      recurrenceId: "2013-05-08T22:00:00.000Z",
    });
  });

  it("skips occurrence rows from the Graph fixture corpus", () => {
    expect(() => normalizeMicrosoftEvent(normalizerCorpus.occurrence)).toThrow(
      ProviderEventError,
    );
  });

  it("normalizes attendees, conference, and category color from the Graph fixture corpus", () => {
    const read = normalizeMicrosoftEvent(
      normalizerCorpus.attendeesAndConference,
      masterCategories,
    );
    expect(read.kind).toBe("event");
    if (read.kind !== "event") return;
    expect(read.content.attendees.length).toBe(2);
    expect(read.content.conference).toEqual({
      url: "https://teams.microsoft.com/l/meetup-join/abc",
      label: "Microsoft Teams",
    });
    expect(read.content.colorHex).toBe("#0078D4");
  });
});

const readerCorpusDir = defaultCorpusDir("microsoft");
const readerAdapter = microsoftRecordedReader(readerCorpusDir);
const readerCorpus = defaultMicrosoftReaderCorpus();

describe("microsoft reader contract", () => {
  it("pages, yields nextSyncToken only at the end, and counts skipped events", async () => {
    const first = await readerAdapter.listEventPage({
      accessToken: "contract-access-token",
      calendarId: "primary",
      colorLabels: microsoftReaderMasterCategories(),
    });
    expect(first.skipped).toBeGreaterThanOrEqual(1);

    let page = first;
    let pages = 1;
    while (page.nextPageToken) {
      expect(page.nextSyncToken).toBeNull();
      page = await readerAdapter.listEventPage({
        accessToken: "contract-access-token",
        calendarId: "primary",
        pageToken: page.nextPageToken,
        colorLabels: microsoftReaderMasterCategories(),
      });
      pages += 1;
    }
    expect(pages).toBe(2);
    expect(page.nextPageToken).toBeNull();
    expect(page.nextSyncToken).toBe(readerCorpus.page2.deltaLink);
  });

  it("maps an expired cursor to cursorExpired", async () => {
    try {
      await readerAdapter.listEventPage({
        accessToken: "contract-access-token",
        calendarId: "primary",
        cursor: readerCorpus.expiredDeltaLink,
      });
      throw new Error("expected cursorExpired");
    } catch (caught) {
      expect((caught as ProviderEventReadError).reason).toBe("cursorExpired");
    }
  });

  it("keeps masters and exceptions and does not expand occurrences", async () => {
    const events = await collectReaderEvents(readerAdapter);
    const masters = events.filter(
      (event) =>
        event.kind === "event" && event.recurrence.kind === "seriesMaster",
    );
    const instances = events.filter(
      (event) => event.kind === "event" && event.recurrence.kind === "instance",
    );
    expect(masters.length).toBeGreaterThanOrEqual(1);
    expect(instances.length).toBeGreaterThanOrEqual(1);
    expect(instances.length).toBeLessThan(5);
  });
});

async function collectReaderEvents(reader: ProviderEventReader) {
  const events = [];
  let pageToken: string | null = null;
  do {
    const page = await reader.listEventPage({
      accessToken: "contract-access-token",
      calendarId: "primary",
      pageToken,
      colorLabels: microsoftReaderMasterCategories(),
    });
    events.push(...page.events);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}
