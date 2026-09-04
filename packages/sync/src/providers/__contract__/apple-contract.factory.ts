import {
  AppleEventReaderAdapter,
  type AppleEventReaderApi,
  type AppleEventResource,
  MULTIGET_BATCH_SIZE,
} from "@sync/providers/apple/apple-event-reader.adapter";
import {
  ProviderEventReadError,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";

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
