import {
  type DiscoveryCorpus,
  type DiscoveryExchange,
  redactAppleFixtureText,
} from "@sync/providers/__contract__/apple-caldav-replay";
import { SMOKE_CALENDAR_NAME } from "@sync/providers/__contract__/live-provider-smoke";
import { recordingApi } from "@sync/providers/__contract__/recording-api";
import {
  createDefaultAppleEventReaderApi,
  MULTIGET_BATCH_SIZE,
} from "@sync/providers/apple/apple-event-reader.adapter";
import {
  createDefaultAppleEventWriterApi,
  eventResourceHref,
} from "@sync/providers/apple/apple-event-writer.adapter";
import {
  type CaldavClient,
  createCaldavClient,
  discoverCalendars,
} from "@sync/providers/apple/caldav-client";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_CORPUS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../sync/src/providers/__contract__/fixtures/apple",
);

export interface RecordAppleContractOptions {
  readonly email: string;
  readonly password: string;
  readonly corpusDir?: string;
}

interface RecordedExchange {
  readonly method: DiscoveryExchange["method"];
  readonly depth?: number;
  readonly status: number;
  readonly body: string;
  readonly name?: string;
}

export async function recordAppleContract(
  options: RecordAppleContractOptions,
): Promise<{ readonly corpusDir: string }> {
  const corpusDir = options.corpusDir ?? DEFAULT_CORPUS_DIR;
  await mkdir(corpusDir, { recursive: true });

  const discoveryExchanges: RecordedExchange[] = [];
  const discoveryClient = wrapRecordingClient(
    createCaldavClient({ username: options.email, password: options.password }),
    discoveryExchanges,
  );

  const discovered = await discoverCalendars(discoveryClient, {
    username: options.email,
    password: options.password,
  });
  const smokeCalendar = discovered.find(
    (calendar) => calendar.displayName === SMOKE_CALENDAR_NAME,
  );
  if (!smokeCalendar) {
    throw new Error(
      `No calendar named ${SMOKE_CALENDAR_NAME} found. Create it on the iCloud test account before recording.`,
    );
  }

  const discovery: DiscoveryCorpus = {
    username: "[email]",
    exchanges: discoveryExchanges.map((exchange) => ({
      method: exchange.method,
      depth: exchange.depth,
      status: exchange.status,
      body: redactAppleFixtureText(exchange.body),
    })),
  };
  await writeJson(corpusDir, "discovery", discovery);

  const readerClient = createCaldavClient({
    username: options.email,
    password: options.password,
  });
  const readerApi = recordingApi(
    createDefaultAppleEventReaderApi(
      options.email,
      options.password,
      () => readerClient,
    ),
    corpusDir,
    "reader-live",
  );
  const firstPage = await readerApi.calendarQuery(smokeCalendar.href, {
    timeMin: "2024-01-01T00:00:00.000Z",
    timeMax: "2027-01-01T00:00:00.000Z",
  });
  const batch = firstPage.slice(0, MULTIGET_BATCH_SIZE);
  if (batch.length > 0) {
    await readerApi.calendarMultiget(smokeCalendar.href, batch);
  }
  const syncToken =
    smokeCalendar.syncToken ??
    (await readerApi.fetchSyncToken(smokeCalendar.href));
  if (syncToken) {
    await readerApi
      .syncCollection(smokeCalendar.href, syncToken)
      .catch(() => undefined);
  }

  const writerClient = createCaldavClient({
    username: options.email,
    password: options.password,
  });
  const writerApi = recordingApi(
    createDefaultAppleEventWriterApi(
      options.password,
      () => writerClient,
      options.email,
    ),
    corpusDir,
    "writer-live",
  );
  const seriesHref = eventResourceHref(smokeCalendar.href, "series-1");
  await writerApi.get(seriesHref).catch(() => undefined);

  const writer = {
    calendarPath: redactAppleFixtureText(new URL(smokeCalendar.href).pathname),
    seriesSeed: {
      uid: "series-1",
      etag: '"series-v1"',
      ics: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:series-1
DTSTAMP:20250101T120000Z
DTSTART:20250115T090000Z
DTEND:20250115T100000Z
RRULE:FREQ=DAILY;COUNT=3
SUMMARY:Contract series
END:VEVENT
END:VCALENDAR`,
    },
    mutationMethods: ["PUT", "GET", "DELETE", "PROPFIND"],
  };
  await writeJson(corpusDir, "writer", writer);

  return { corpusDir };
}

function wrapRecordingClient(
  client: CaldavClient,
  exchanges: RecordedExchange[],
): CaldavClient {
  return {
    propfind: async (url, props, depth) => {
      const response = await client.propfind(url, props, depth);
      exchanges.push({
        method: "PROPFIND",
        depth,
        status: response.status,
        body: response.body,
      });
      return response;
    },
    report: async (url, bodyXml, depth) => {
      const response = await client.report(url, bodyXml, depth);
      exchanges.push({
        method: "REPORT",
        depth,
        status: response.status,
        body: response.body,
        name: inferReportName(bodyXml),
      });
      return response;
    },
    put: async (url, ics, options) => {
      const response = await client.put(url, ics, options);
      exchanges.push({
        method: "PUT",
        status: response.status,
        body: response.body,
      });
      return response;
    },
    delete: async (url, ifMatch) => {
      const response = await client.delete(url, ifMatch);
      exchanges.push({
        method: "DELETE",
        status: response.status,
        body: response.body,
      });
      return response;
    },
    get: async (url) => {
      const response = await client.get(url);
      exchanges.push({
        method: "GET",
        status: response.status,
        body: response.body,
      });
      return response;
    },
  };
}

function inferReportName(bodyXml: string): string | undefined {
  if (bodyXml.includes("calendar-query")) return "calendar-query";
  if (bodyXml.includes("calendar-multiget")) return "calendar-multiget";
  if (bodyXml.includes("sync-collection")) return "sync-collection";
  return undefined;
}

async function writeJson(
  corpusDir: string,
  name: string,
  value: unknown,
): Promise<void> {
  await writeFile(
    join(corpusDir, `${name}.json`),
    `${JSON.stringify(value, null, 2)}\n`,
  );
}

export function resolveAppleRecordCredentials(): {
  email: string;
  password: string;
} {
  const email =
    process.env["SMOKE_APPLE_EMAIL"]?.trim() ??
    process.env["ICLOUD_EMAIL"]?.trim() ??
    "";
  const password =
    process.env["SMOKE_APPLE_APP_PASSWORD"]?.trim() ??
    process.env["ICLOUD_APP_PASSWORD"]?.trim() ??
    "";
  if (!email || !password) {
    throw new Error(
      "Set SMOKE_APPLE_EMAIL and SMOKE_APPLE_APP_PASSWORD (or ICLOUD_EMAIL and ICLOUD_APP_PASSWORD) before record-apple-contract",
    );
  }
  return { email, password };
}

export async function runRecordAppleContractCommand(): Promise<void> {
  const { email, password } = resolveAppleRecordCredentials();
  const result = await recordAppleContract({ email, password });
  console.log(
    `Recorded Apple contract fixtures under ${result.corpusDir}. Review reader-live.json and writer-live.json, redact if needed, then merge into reader.json when contract cases match.`,
  );
}
