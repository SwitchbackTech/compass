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

const CALENDARS_WITH_REMINDERS_XML = `<?xml version="1.0" encoding="utf-8"?>
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
    <D:href>/123456789/calendars/reminders/</D:href>
    <D:propstat>
      <D:prop>
        <D:displayname>Reminders</D:displayname>
        <D:resourcetype><D:collection/><C:calendar/></D:resourcetype>
        <D:current-user-privilege-set>
          <D:privilege><D:write/></D:privilege>
        </D:current-user-privilege-set>
        <C:supported-calendar-component-set>
          <C:comp name="VTODO"/>
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

function scriptedFetch(
  handlers: Array<
    (url: string, init?: RequestInit) => Response | Promise<Response>
  >,
): CaldavFetch {
  let call = 0;
  return async (url, init) => {
    const handler = handlers[call];
    if (!handler) {
      throw new Error(`No handler scripted for request ${call} to ${url}`);
    }
    call += 1;
    return handler(String(url), init);
  };
}

function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 207,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}

function adapterWithFetch(fetchImpl: CaldavFetch) {
  return new AppleCalendarAdapter("user@icloud.com", (username, password) =>
    createCaldavClient({ username, password }, fetchImpl),
  );
}

describe("AppleCalendarAdapter", () => {
  it("maps privilege, color alpha stripping, and primary by account default", async () => {
    const fetchImpl = scriptedFetch([
      () => xmlResponse(PRINCIPAL_XML),
      () => xmlResponse(HOME_SET_XML),
      () => xmlResponse(CALENDARS_WITH_REMINDERS_XML),
    ]);
    const adapter = adapterWithFetch(fetchImpl);

    const result = await adapter.discoverCalendars({ accessToken: "secret" });

    expect(result.cursor).toBeNull();
    expect(result.calendars.map((calendar) => calendar.displayName)).toEqual([
      "user",
      "Work",
    ]);
    expect(result.calendars[0]).toMatchObject({
      color: "#AABBCC",
      primary: true,
      accessRole: "editor",
      capabilities: { canWriteEvents: true, canInviteAttendees: true },
      createsGoogleMeet: false,
      eventLabels: [],
    });
    expect(result.calendars[1]).toMatchObject({
      primary: false,
      accessRole: "viewer",
      capabilities: { canWriteEvents: false, canInviteAttendees: false },
    });
  });

  it("excludes VTODO-only collections such as Reminders", async () => {
    const fetchImpl = scriptedFetch([
      () => xmlResponse(PRINCIPAL_XML),
      () => xmlResponse(HOME_SET_XML),
      () => xmlResponse(CALENDARS_WITH_REMINDERS_XML),
    ]);
    const adapter = adapterWithFetch(fetchImpl);

    const result = await adapter.discoverCalendars({ accessToken: "secret" });

    expect(
      result.calendars.some((calendar) => calendar.displayName === "Reminders"),
    ).toBe(false);
  });

  it("marks the first writable calendar primary when no name matches the account default", async () => {
    const noDefaultMatchXml = CALENDARS_WITH_REMINDERS_XML.replace(
      "<D:displayname>user</D:displayname>",
      "<D:displayname>Personal</D:displayname>",
    );
    const fetchImpl = scriptedFetch([
      () => xmlResponse(PRINCIPAL_XML),
      () => xmlResponse(HOME_SET_XML),
      () => xmlResponse(noDefaultMatchXml),
    ]);
    const adapter = adapterWithFetch(fetchImpl);

    const result = await adapter.discoverCalendars({ accessToken: "secret" });

    expect(
      result.calendars.find((calendar) => calendar.primary)?.displayName,
    ).toBe("Personal");
  });

  it("maps CalDAV auth failures to ProviderCalendarError authExpired", async () => {
    const fetchImpl = scriptedFetch([() => new Response("", { status: 401 })]);
    const adapter = adapterWithFetch(fetchImpl);

    await expect(
      adapter.discoverCalendars({ accessToken: "wrong" }),
    ).rejects.toMatchObject({
      reason: "authExpired",
      name: "ProviderCalendarError",
    });
  });
});
