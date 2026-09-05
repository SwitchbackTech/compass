import { SYNC_COLLECTION_LIMIT } from "@sync/providers/apple/apple-event-reader.adapter";
import {
  createCaldavClient,
  discoverCalendars,
} from "@sync/providers/apple/caldav-client";

export interface ApplePollThrottleOptions {
  readonly email: string;
  readonly password: string;
  readonly intervalMs: number;
  readonly durationMs: number;
  readonly calendarHref?: string;
  readonly now?: () => Date;
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface ApplePollSample {
  readonly at: string;
  readonly status: number;
  readonly throttled: boolean;
}

export interface ApplePollThrottleResult {
  readonly calendarHref: string;
  readonly intervalMs: number;
  readonly durationMs: number;
  readonly samples: readonly ApplePollSample[];
  readonly throttleStatuses: readonly number[];
  readonly minimumSafeIntervalMs: number | null;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function buildSyncCollectionBody(syncToken: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<D:sync-collection xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:sync-token>${escapeXml(syncToken)}</D:sync-token>
  <D:sync-level>1</D:sync-level>
  <D:limit>${SYNC_COLLECTION_LIMIT}</D:limit>
  <D:prop>
    <D:getetag/>
  </D:prop>
</D:sync-collection>`;
}

function extractSyncToken(body: string): string | null {
  const match = body.match(
    /<(?:D:)?sync-token[^>]*>([^<]+)<\/(?:D:)?sync-token>/i,
  );
  return match?.[1]?.trim() ?? null;
}

function isThrottleStatus(status: number): boolean {
  return status === 429 || status === 503;
}

export async function runApplePollThrottle(
  options: ApplePollThrottleOptions,
): Promise<ApplePollThrottleResult> {
  const now = options.now ?? (() => new Date());
  const sleep = options.sleep ?? ((ms: number) => Bun.sleep(ms));
  const client = createCaldavClient({
    username: options.email,
    password: options.password,
  });

  const discovered = await discoverCalendars(client, {
    username: options.email,
    password: options.password,
  });
  const calendar =
    discovered.find((entry) => entry.href === options.calendarHref) ??
    discovered.find((entry) => entry.syncToken) ??
    discovered[0];
  if (!calendar?.syncToken) {
    throw new Error(
      "Apple poll throttle probe could not resolve a calendar with a sync-token",
    );
  }

  let syncToken = calendar.syncToken;
  const samples: ApplePollSample[] = [];
  const deadline = now().getTime() + options.durationMs;

  while (now().getTime() < deadline) {
    const response = await client.report(
      calendar.href,
      buildSyncCollectionBody(syncToken),
      1,
    );
    const throttled = isThrottleStatus(response.status);
    samples.push({
      at: now().toISOString(),
      status: response.status,
      throttled,
    });
    if (throttled) {
      break;
    }

    const nextToken = extractSyncToken(response.body);
    if (nextToken) {
      syncToken = nextToken;
    }

    const remaining = deadline - now().getTime();
    if (remaining <= 0) break;
    await sleep(Math.min(options.intervalMs, remaining));
  }

  const throttleStatuses = samples
    .filter((sample) => sample.throttled)
    .map((sample) => sample.status);
  const minimumSafeIntervalMs =
    throttleStatuses.length === 0 ? options.intervalMs : null;

  return {
    calendarHref: calendar.href,
    intervalMs: options.intervalMs,
    durationMs: options.durationMs,
    samples,
    throttleStatuses,
    minimumSafeIntervalMs,
  };
}

function readFlag(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  return argv[index + 1]?.trim() || undefined;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, got ${raw}`);
  }
  return parsed;
}

export function parseApplePollThrottleArgs(argv: string[]): {
  intervalMs: number;
  durationMs: number;
  calendarHref?: string;
} {
  return {
    intervalMs:
      readPositiveInt(readFlag(argv, "--interval-seconds"), 5) * 1_000,
    durationMs:
      readPositiveInt(readFlag(argv, "--duration-seconds"), 30 * 60) * 1_000,
    calendarHref: readFlag(argv, "--calendar-href"),
  };
}

export function resolveApplePollCredentials(): {
  email: string;
  password: string;
} {
  const email =
    process.env["SMOKE_APPLE_EMAIL"]?.trim() ??
    process.env["ICLOUD_EMAIL"]?.trim();
  const password =
    process.env["SMOKE_APPLE_APP_PASSWORD"]?.trim() ??
    process.env["ICLOUD_APP_PASSWORD"]?.trim();
  if (!email || !password) {
    throw new Error(
      "Set SMOKE_APPLE_EMAIL and SMOKE_APPLE_APP_PASSWORD (or ICLOUD_EMAIL and ICLOUD_APP_PASSWORD) before apple-poll-throttle",
    );
  }
  return { email, password };
}

/**
 * Poll one iCloud calendar with RFC 6578 sync-collection and record HTTP
 * status codes. Founder soak: run for 30 minutes at candidate intervals to
 * find the shortest gap iCloud tolerates without 429/503.
 *
 *   bun run cli apple-poll-throttle [--interval-seconds 5] [--duration-seconds 1800]
 */
export async function runApplePollThrottleCommand(): Promise<void> {
  const args = parseApplePollThrottleArgs(process.argv.slice(3));
  const credential = resolveApplePollCredentials();
  const result = await runApplePollThrottle({
    ...credential,
    ...args,
  });

  console.log(
    JSON.stringify(
      {
        calendarHref: result.calendarHref,
        intervalMs: result.intervalMs,
        durationMs: result.durationMs,
        sampleCount: result.samples.length,
        throttleStatuses: result.throttleStatuses,
        minimumSafeIntervalMs: result.minimumSafeIntervalMs,
        recommendedDefaultIntervalMs:
          result.minimumSafeIntervalMs === null
            ? null
            : Math.ceil(result.minimumSafeIntervalMs * 1.5),
        samples: result.samples,
      },
      null,
      2,
    ),
  );
}
