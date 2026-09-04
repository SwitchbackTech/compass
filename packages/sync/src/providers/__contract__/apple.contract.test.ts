import { type DiscoveryContractCase } from "@sync/providers/__contract__/discovery.contract";
import { AppleCalendarAdapter } from "@sync/providers/apple/apple-calendar.adapter";
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
<D:multistatus xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:ICAL="http://apple.com/ns/ical/">
  <D:response>
    <D:href>/123456789/calendars/home/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>user</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <ICAL:calendar-color>#AABBCCFF</ICAL:calendar-color>
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
  <D:response>
    <D:href>/123456789/calendars/work/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>Work</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <D:current-user-privilege-set>
          <D:privilege><D:read/></D:privilege>
        </D:current-user-privilege-set>
        <C:supported-calendar-component-set>
          <C:comp name="VEVENT"/>
        </C:supported-calendar-component-set>
      </D:prop>
      <D:status>HTTP/1.1 200 OK</D:status>
    </D:propstat>
  </D:response>
</D:multistatus>`;

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 207,
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

const APPLE_DISCOVERY_CASES: DiscoveryContractCase[] = [
  {
    name: "detects the account-default calendar as primary",
    username: "user@icloud.com",
    password: "secret",
    run: async (adapter) => {
      const result = await adapter.discoverCalendars({
        accessToken: "secret",
      });
      expect(
        result.calendars.find((calendar) => calendar.primary)?.displayName,
      ).toBe("user");
    },
  },
  {
    name: "maps calendar colors and access roles",
    username: "user@icloud.com",
    password: "secret",
    run: async (adapter) => {
      const result = await adapter.discoverCalendars({
        accessToken: "secret",
      });
      expect(result.calendars[0]?.color).toBe("#AABBCC");
      expect(result.calendars[0]?.accessRole).toBe("editor");
      expect(result.calendars[1]?.accessRole).toBe("viewer");
    },
  },
  {
    name: "returns a null incremental cursor",
    username: "user@icloud.com",
    password: "secret",
    run: async (adapter) => {
      const result = await adapter.discoverCalendars({
        accessToken: "secret",
      });
      expect(result.cursor).toBeNull();
    },
  },
];

describe("apple discovery contract", () => {
  for (const testCase of APPLE_DISCOVERY_CASES) {
    it(testCase.name, async () => {
      const adapter = new AppleCalendarAdapter(
        "user@icloud.com",
        (username, password) =>
          createCaldavClient({ username, password }, discoveryFetch()),
      );
      await testCase.run(adapter);
    });
  }
});
