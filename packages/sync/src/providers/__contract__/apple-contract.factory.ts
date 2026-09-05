import {
  loadDiscoveryFetch,
  loadJson,
} from "@sync/providers/__contract__/apple-caldav-replay";
import { AppleAuthAdapter } from "@sync/providers/apple/apple-auth.adapter";
import { AppleCalendarAdapter } from "@sync/providers/apple/apple-calendar.adapter";
import {
  AppleEventReaderAdapter,
  type AppleEventReaderApi,
  type AppleEventResource,
} from "@sync/providers/apple/apple-event-reader.adapter";
import {
  AppleEventWriter,
  type AppleEventWriterApi,
  createDefaultAppleEventWriterApi,
  eventResourceHref,
} from "@sync/providers/apple/apple-event-writer.adapter";
import { AppleNotificationAdapter } from "@sync/providers/apple/apple-notifications.adapter";
import {
  type CaldavResponse,
  createCaldavClient,
} from "@sync/providers/apple/caldav-client";
import { type ProviderAdapters } from "@sync/providers/provider-adapters";
import {
  ProviderEventReadError,
  type ProviderEventReader,
} from "@sync/providers/provider-event-reader.port";

interface ReaderCorpus {
  readonly initialHrefs: readonly string[];
  readonly initialResources: Record<string, AppleEventResource>;
  readonly expiredCursor: string;
  readonly syncToken: string;
  readonly nextSyncToken: string;
}

interface WriterCorpus {
  readonly calendarPath: string;
  readonly seriesSeed: {
    readonly uid: string;
    readonly etag: string;
    readonly ics: string;
  };
}

const CONTRACT_USERNAME = "[email]";

function resource(
  href: string,
  ics: string,
  etag = '"etag-redacted"',
): AppleEventResource {
  return { href, etag, ics };
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
      nextSyncToken: this.corpus.nextSyncToken,
      truncated: false,
    };
  }

  async fetchSyncToken(): Promise<string | null> {
    return this.corpus.syncToken;
  }
}

class CorpusAppleEventWriterApi implements AppleEventWriterApi {
  #store = new Map<string, { etag: string; ics: string }>();
  #etagCounter = 1;

  constructor(corpus: WriterCorpus) {
    const calendarUrl = `https://caldav.icloud.com${corpus.calendarPath}`;
    const href = eventResourceHref(calendarUrl, corpus.seriesSeed.uid);
    this.#store.set(href, {
      etag: corpus.seriesSeed.etag,
      ics: corpus.seriesSeed.ics,
    });
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

export function appleRecordedReader(corpusDir: string): ProviderEventReader {
  const readerCorpus = loadJson<ReaderCorpus>(corpusDir, "reader");
  return new AppleEventReaderAdapter(CONTRACT_USERNAME, {
    connectionTimeZone: "UTC",
    makeApi: () => new CorpusAppleEventReaderApi(readerCorpus),
    log: { warn: () => {} },
  });
}

/**
 * Build Apple adapters that replay `fixtures/apple/*.json`. Synthesized from
 * the adapter unit tests; founder re-recording uses `record-apple-contract`.
 */
export function appleRecordedFactory(corpusDir: string): ProviderAdapters {
  const writerCorpus = loadJson<WriterCorpus>(corpusDir, "writer");
  const discoveryFetch = loadDiscoveryFetch(corpusDir);
  const writerApi = new CorpusAppleEventWriterApi(writerCorpus);
  return {
    auth: new AppleAuthAdapter((credential, fetchImpl) =>
      createCaldavClient(credential, fetchImpl ?? discoveryFetch),
    ),
    calendars: new AppleCalendarAdapter(
      CONTRACT_USERNAME,
      (username, password) =>
        createCaldavClient({ username, password }, discoveryFetch),
    ),
    reader: appleRecordedReader(corpusDir),
    writer: new AppleEventWriter({
      makeApi: () => writerApi,
    }),
    notifications: new AppleNotificationAdapter(),
  };
}

export function appleLiveFactory(_corpusDir: string): ProviderAdapters {
  const email = smokeAppleEmail();
  return {
    auth: new AppleAuthAdapter(),
    calendars: new AppleCalendarAdapter(email),
    reader: new AppleEventReaderAdapter(email),
    writer: new AppleEventWriter({
      makeApi: (accessToken) =>
        createDefaultAppleEventWriterApi(accessToken, undefined, email),
    }),
    notifications: new AppleNotificationAdapter(),
  };
}

export function hasAppleLiveCredentials(): boolean {
  return Boolean(smokeAppleEmail() && smokeAppleAppPassword());
}

export function smokeAppleEmail(): string {
  return (
    process.env["SMOKE_APPLE_EMAIL"]?.trim() ??
    process.env["ICLOUD_EMAIL"]?.trim() ??
    ""
  );
}

export function smokeAppleAppPassword(): string {
  return (
    process.env["SMOKE_APPLE_APP_PASSWORD"]?.trim() ??
    process.env["ICLOUD_APP_PASSWORD"]?.trim() ??
    ""
  );
}
