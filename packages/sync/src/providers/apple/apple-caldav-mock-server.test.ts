import { AppleAuthAdapter } from "@sync/providers/apple/apple-auth.adapter";
import {
  type CaldavFetch,
  createCaldavClient,
} from "@sync/providers/apple/caldav-client";

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

describe("Apple CalDAV credential validation against a mock HTTP server", () => {
  it("completes discovery through Bun.serve and validateCredential", async () => {
    let propfindCount = 0;
    const server = Bun.serve({
      port: 0,
      hostname: "127.0.0.1",
      async fetch(request) {
        if (request.method === "PROPFIND") {
          propfindCount += 1;
          if (propfindCount === 1) return xmlResponse(PRINCIPAL_XML);
          if (propfindCount === 2) return xmlResponse(HOME_SET_XML);
          return xmlResponse(CALENDARS_XML);
        }
        return new Response("not found", { status: 404 });
      },
    });

    const origin = `http://127.0.0.1:${server.port}`;
    const fetchImpl: CaldavFetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const mapped = url.replace("https://caldav.icloud.com", origin);
      return fetch(mapped, init);
    };

    const adapter = new AppleAuthAdapter((credential, injectedFetch) =>
      createCaldavClient(credential, injectedFetch ?? fetchImpl),
    );

    try {
      await expect(
        adapter.validateCredential({
          username: "user@icloud.com",
          secret: "mock-app-password",
        }),
      ).resolves.toBeUndefined();
      expect(propfindCount).toBeGreaterThanOrEqual(3);
    } finally {
      server.stop(true);
    }
  });
});
