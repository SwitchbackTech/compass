import { AppleAuthAdapter } from "@sync/providers/apple/apple-auth.adapter";
import { AppleCalendarAdapter } from "@sync/providers/apple/apple-calendar.adapter";
import {
  AppleEventReaderAdapter,
  type AppleEventReaderApi,
  type AppleEventResource,
  MULTIGET_BATCH_SIZE,
} from "@sync/providers/apple/apple-event-reader.adapter";
import {
  AppleEventWriter,
  type AppleEventWriterApi,
  eventResourceHref,
} from "@sync/providers/apple/apple-event-writer.adapter";
import {
  type CaldavFetch,
  type CaldavResponse,
  createCaldavClient,
} from "@sync/providers/apple/caldav-client";
import { type ProviderAdapters } from "@sync/providers/provider-adapters";
import {
  ProviderEventReadError,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";
import {
  type ProviderNotificationAdapter,
  ProviderNotificationError,
} from "@sync/providers/provider-notifications.port";

interface ReaderCorpus {
  readonly initialHrefs: readonly string[];
  readonly initialResources: Record<string, AppleEventResource>;
  readonly expiredCursor: string;
}

const TIMED_ICS = (uid: string, summary: string) => `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:${uid}
DTSTAMP:20250101T120000Z
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
SUMMARY:${summary}
END:VEVENT
END:VCALENDAR`;

const SERIES_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:series-1@icloud.com
DTSTAMP:20250101T120000Z
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Contract series
END:VEVENT
BEGIN:VEVENT
UID:series-1@icloud.com
DTSTAMP:20250101T120001Z
DTSTART:20250116T100000Z
DTEND:20250116T110000Z
RECURRENCE-ID:20250116T090000Z
SUMMARY:Contract exception
END:VEVENT
END:VCALENDAR`;

const ALL_DAY_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:allday@icloud.com
DTSTAMP:20250101T120000Z
DTSTART;VALUE=DATE:20250222
DTEND;VALUE=DATE:20250223
SUMMARY:All day
TRANSP:TRANSPARENT
END:VEVENT
END:VCALENDAR`;

const ATTENDEE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:attendee@icloud.com
DTSTAMP:20250101T120000Z
DTSTART:20250115T140000Z
DTEND:20250115T143000Z
SUMMARY:Standup
URL:https://meet.example.com/abc
ATTENDEE;CN=A;PARTSTAT=ACCEPTED:mailto:a@example.com
END:VEVENT
END:VCALENDAR`;

const CANCELLED_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:cancelled@icloud.com
DTSTAMP:20250101T120000Z
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
STATUS:CANCELLED
SUMMARY:Cancelled
END:VEVENT
END:VCALENDAR`;

const UNUSABLE_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:No uid
END:VEVENT
END:VCALENDAR`;

function resource(
  href: string,
  ics: string,
  etag = '"etag"',
): AppleEventResource {
  return { href, etag, ics };
}

function defaultReaderCorpus(): ReaderCorpus {
  const initialHrefs = Array.from(
    { length: MULTIGET_BATCH_SIZE + 1 },
    (_, index) => `/123/calendars/home/event-${index}.ics`,
  );
  const initialResources: Record<string, AppleEventResource> = {
    [initialHrefs[0]!]: resource(
      initialHrefs[0]!,
      TIMED_ICS("timed@icloud.com", "Timed master"),
    ),
    [initialHrefs[1]!]: resource(initialHrefs[1]!, ALL_DAY_ICS),
    [initialHrefs[2]!]: resource(initialHrefs[2]!, SERIES_ICS, '"series-etag"'),
    [initialHrefs[3]!]: resource(initialHrefs[3]!, ATTENDEE_ICS),
    [initialHrefs[4]!]: resource(initialHrefs[4]!, CANCELLED_ICS),
    [initialHrefs[5]!]: resource(initialHrefs[5]!, UNUSABLE_ICS),
  };
  for (const href of initialHrefs.slice(6, MULTIGET_BATCH_SIZE)) {
    initialResources[href] = resource(
      href,
      TIMED_ICS(`bulk-${href}`, "Bulk event"),
    );
  }
  return {
    initialHrefs,
    initialResources,
    expiredCursor: "expired-sync-token",
  };
}

class CorpusAppleEventReaderApi implements AppleEventReaderApi {
  constructor(private readonly corpus: ReaderCorpus) {}

  async calendarQuery(): Promise<readonly string[]> {
    return this.corpus.initialHrefs;
  }

  async calendarMultiget(
    _calendarUrl: string,
    hrefs: readonly string[],
  ): Promise<readonly AppleEventResource[]> {
    return hrefs.map(
      (href) =>
        this.corpus.initialResources[href] ??
        resource(href, TIMED_ICS(`paged-${href}`, "Paged event")),
    );
  }

  async syncCollection(
    _calendarUrl: string,
    syncToken: string,
  ): Promise<{
    changedHrefs: readonly string[];
    deletedHrefs: readonly string[];
    nextSyncToken: string | null;
    truncated: boolean;
  }> {
    if (syncToken === this.corpus.expiredCursor) {
      throw new ProviderEventReadError(
        "cursorExpired",
        "Apple sync token is no longer valid",
      );
    }
    return {
      changedHrefs: [],
      deletedHrefs: [],
      nextSyncToken: "sync-token-2",
      truncated: false,
    };
  }

  async fetchSyncToken(): Promise<string | null> {
    return "sync-token-1";
  }
}

export function appleRecordedReader(_corpusDir: string): ProviderEventReader {
  const readerCorpus = defaultReaderCorpus();
  return new AppleEventReaderAdapter("user@icloud.com", {
    connectionTimeZone: "UTC",
    makeApi: () => new CorpusAppleEventReaderApi(readerCorpus),
    log: { warn: () => {} },
  });
}

const CONTRACT_CALENDAR = "/123456789/calendars/home/";
const CONTRACT_CALENDAR_URL = `https://caldav.icloud.com${CONTRACT_CALENDAR}`;

const WRITER_SERIES_ICS = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:series-1
DTSTAMP:20250101T120000Z
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Contract series
END:VEVENT
END:VCALENDAR`;

class CorpusAppleEventWriterApi implements AppleEventWriterApi {
  #store = new Map<string, { etag: string; ics: string }>();
  #etagCounter = 1;

  constructor() {
    const href = eventResourceHref(CONTRACT_CALENDAR_URL, "series-1");
    this.#store.set(href, { etag: '"series-v1"', ics: WRITER_SERIES_ICS });
  }

  put(
    url: string,
    ics: string,
    options: { ifMatch?: string; ifNoneMatch?: string } = {},
  ): Promise<CaldavResponse> {
    const existing = this.#store.get(url);
    if (options.ifNoneMatch === "*" && existing) {
      return Promise.resolve({
        status: 412,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    if (options.ifMatch && existing && options.ifMatch !== existing.etag) {
      return Promise.resolve({
        status: 412,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    const etag = `"writer-v${this.#etagCounter++}"`;
    this.#store.set(url, { etag, ics });
    return Promise.resolve({
      status: 201,
      headers: { etag },
      body: "",
      multistatus: null,
    });
  }

  get(url: string): Promise<CaldavResponse> {
    const existing = this.#store.get(url);
    if (!existing) {
      return Promise.resolve({
        status: 404,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    return Promise.resolve({
      status: 200,
      headers: { etag: existing.etag },
      body: existing.ics,
      multistatus: null,
    });
  }

  delete(url: string, ifMatch?: string): Promise<CaldavResponse> {
    const existing = this.#store.get(url);
    if (!existing) {
      return Promise.resolve({
        status: 404,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    if (ifMatch && ifMatch !== existing.etag) {
      return Promise.resolve({
        status: 412,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    this.#store.delete(url);
    return Promise.resolve({
      status: 204,
      headers: {},
      body: "",
      multistatus: null,
    });
  }

  propfind(url: string): Promise<CaldavResponse> {
    const existing = this.#store.get(url);
    if (!existing) {
      return Promise.resolve({
        status: 404,
        headers: {},
        body: "",
        multistatus: null,
      });
    }
    return Promise.resolve({
      status: 207,
      headers: {},
      body: "",
      multistatus: {
        responses: [
          {
            href: url,
            propstats: [{ status: 200, props: { getetag: existing.etag } }],
          },
        ],
      },
    });
  }
}

class AppleNotificationStub implements ProviderNotificationAdapter {
  async watch(): Promise<never> {
    throw new ProviderNotificationError(
      "watchUnsupported",
      "Apple uses polling instead of push channels",
    );
  }

  async stopChannel(): Promise<void> {}

  parseNotification() {
    return null;
  }
}

function discoveryFetch(): CaldavFetch {
  const handlers = [
    () => xmlResponse(PRINCIPAL_XML),
    () => xmlResponse(HOME_SET_XML),
    () => xmlResponse(CALENDARS_XML),
  ];
  let call = 0;
  return (async (...args: Parameters<CaldavFetch>) => {
    void args;
    const handler = handlers[call];
    call += 1;
    if (!handler) throw new Error("unexpected discovery request");
    return handler();
  }) as unknown as CaldavFetch;
}

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
        <cs:sync-token xmlns:cs="http://calendarserver.org/ns/">sync-token-1</cs:sync-token>
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

export function appleRecordedFactory(_corpusDir: string): ProviderAdapters {
  const writerApi = new CorpusAppleEventWriterApi();
  return {
    auth: new AppleAuthAdapter((credential, fetchImpl) =>
      createCaldavClient(credential, fetchImpl ?? discoveryFetch()),
    ),
    calendars: new AppleCalendarAdapter(
      "user@icloud.com",
      (username, password) =>
        createCaldavClient({ username, password }, discoveryFetch()),
    ),
    reader: appleRecordedReader(_corpusDir),
    writer: new AppleEventWriter({
      makeApi: () => writerApi,
    }),
    notifications: new AppleNotificationStub(),
  };
}
