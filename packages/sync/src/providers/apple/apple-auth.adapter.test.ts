import {
  AppleAuthAdapter,
  isPasswordCredentialAuthAdapter,
} from "@sync/providers/apple/apple-auth.adapter";
import {
  type CaldavFetch,
  createCaldavClient,
} from "@sync/providers/apple/caldav-client";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";

const PRINCIPAL_XML = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/</D:href>
    <D:propstat>
      <D:prop>
        <D:current-user-principal>
          <D:href>/123456789/principal/</D:href>
        </D:current-user-principal>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

const HOME_SET_XML = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:">
  <D:response>
    <D:href>/123456789/principal/</D:href>
    <D:propstat>
      <D:prop>
        <D:calendar-home-set>
          <D:href>/123456789/calendars/</D:href>
        </D:calendar-home-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

const CALENDARS_XML = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:response>
    <D:href>/123456789/calendars/home/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>home</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <D:current-user-privilege-set>
          <D:privilege><D:write/></D:privilege>
        </D:current-user-privilege-set>
        <C:supported-calendar-component-set>
          <C:comp name="VEVENT"/>
        </C:supported-calendar-component-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

function xmlResponse(body: string, status = 207): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

function discoveryFetch(): CaldavFetch {
  const handlers = [
    () => xmlResponse(PRINCIPAL_XML),
    () => xmlResponse(HOME_SET_XML),
    () => xmlResponse(CALENDARS_XML),
  ];
  let call = 0;
  return async () => {
    const handler = handlers[call];
    call += 1;
    if (!handler) throw new Error("unexpected discovery request");
    return handler();
  };
}

describe("AppleAuthAdapter", () => {
  it("validates a credential by running CalDAV discovery", async () => {
    const adapter = new AppleAuthAdapter((credential, fetchImpl) =>
      createCaldavClient(credential, fetchImpl ?? discoveryFetch()),
    );

    await expect(
      adapter.validateCredential({
        username: "user@icloud.com",
        secret: "app-specific",
      }),
    ).resolves.toBeUndefined();
  });

  it("maps a wrong password to authorizationRevoked", async () => {
    const fetchImpl: CaldavFetch = async () =>
      new Response("", { status: 401 });
    const adapter = new AppleAuthAdapter((credential, injectedFetch) =>
      createCaldavClient(credential, injectedFetch ?? fetchImpl),
    );

    await expect(
      adapter.validateCredential({
        username: "user@icloud.com",
        secret: "wrong",
      }),
    ).rejects.toMatchObject({
      reason: "authorizationRevoked",
    });
    await expect(
      adapter.validateCredential({
        username: "user@icloud.com",
        secret: "wrong",
      }),
    ).rejects.toBeInstanceOf(ProviderAuthError);
  });

  it("maps throttling to refreshFailed", async () => {
    const fetchImpl: CaldavFetch = async () =>
      new Response("", { status: 503 });
    const adapter = new AppleAuthAdapter((credential, injectedFetch) =>
      createCaldavClient(credential, injectedFetch ?? fetchImpl),
    );

    await expect(
      adapter.validateCredential({
        username: "user@icloud.com",
        secret: "secret",
      }),
    ).rejects.toMatchObject({
      reason: "refreshFailed",
    });
  });

  it("rejects OAuth redirect with unsupported", () => {
    const adapter = new AppleAuthAdapter();
    expect(() =>
      adapter.buildAuthorizationUrl({
        state: "state",
        redirectUri: "https://example.com/callback",
      }),
    ).toThrow(
      expect.objectContaining({
        reason: "unsupported",
      }),
    );
  });

  it("rejects authorization code exchange with unsupported", async () => {
    const adapter = new AppleAuthAdapter();
    await expect(
      adapter.exchangeAuthorizationCode({
        code: "code",
        redirectUri: "https://example.com/callback",
      }),
    ).rejects.toMatchObject({ reason: "unsupported" });
  });

  it("returns the password unchanged with a far-future expiry on refresh", async () => {
    const adapter = new AppleAuthAdapter();
    const refreshed = await adapter.refreshAccessToken({
      refreshToken: "app-specific",
    });
    expect(refreshed.accessToken).toBe("app-specific");
    expect(refreshed.grantedScopes).toEqual([]);
    expect(refreshed.expiresAt.getFullYear()).toBeGreaterThanOrEqual(2099);
  });

  it("revokes without calling the provider", async () => {
    const adapter = new AppleAuthAdapter();
    await expect(adapter.revoke({ token: "secret" })).resolves.toBeUndefined();
  });

  it("exposes validateCredential through the password auth adapter guard", () => {
    const adapter = new AppleAuthAdapter();
    expect(isPasswordCredentialAuthAdapter(adapter)).toBe(true);
  });
});
