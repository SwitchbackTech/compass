import { EventScheduleSchema } from "@core/types/event.contracts";
import { SyncEventContentSchema } from "@core/types/sync/event.contracts";
import { type ProviderKind } from "@core/types/sync/identity.contracts";
import { type ProviderAdapters } from "@sync/providers/provider-adapters";
import { ProviderAuthError } from "@sync/providers/provider-auth.port";
import { type ProviderEventReadError } from "@sync/providers/provider-event-reader.port";
import {
  type ProviderEventWriter,
  ProviderWriteError,
} from "@sync/providers/provider-event-writer.port";
import { beforeEach, describe, expect, it } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type ProviderContractFactory = (corpusDir: string) => ProviderAdapters;

export interface ProviderContractOptions {
  readonly corpusDir?: string;
  readonly accessToken?: string;
  readonly calendarId?: string;
  readonly refreshToken?: string;
  readonly revokedRefreshToken?: string;
  readonly expiredCursor?: string;
  readonly skipAuthExchange?: boolean;
  readonly skipAuthRevoked?: boolean;
  readonly skipWatch?: boolean;
}

const CONTRACT_ROOT = dirname(fileURLToPath(import.meta.url));

export const CONTRACT_EVENT_ID = "abc12deadbeef00000000000";

export const CONTRACT_CONTENT = SyncEventContentSchema.parse({
  title: "Contract create",
  description: "WP-11 contract suite",
  location: null,
  organizer: null,
  attendees: [],
  conference: null,
});

export const CONTRACT_SCHEDULE = EventScheduleSchema.parse({
  kind: "timed",
  start: "2025-01-15T09:00:00-05:00",
  end: "2025-01-15T10:00:00-05:00",
  timeZone: "America/New_York",
});

const ACCESS_ROLES = new Set(["owner", "editor", "viewer", "busyOnly"]);

export function defaultCorpusDir(kind: ProviderKind): string {
  return join(CONTRACT_ROOT, "fixtures", kind);
}

/**
 * Run the shared adapter contract against one provider. `factory` builds
 * the adapter set from a recorded fixture corpus (or, when `LIVE_PROVIDER`
 * is set, from the real API constructors).
 */
export function describeProviderContract(
  kind: ProviderKind,
  factory: ProviderContractFactory,
  options: ProviderContractOptions = {},
): void {
  const corpusDir = options.corpusDir ?? defaultCorpusDir(kind);
  const token = () =>
    process.env["LIVE_ACCESS_TOKEN"] ??
    options.accessToken ??
    "contract-access-token";
  const calendarId =
    process.env["LIVE_CALENDAR_ID"] ?? options.calendarId ?? "primary";
  const refreshToken =
    options.refreshToken ??
    process.env["SMOKE_GOOGLE_REFRESH_TOKEN"] ??
    "refresh-token-value";
  const revokedRefreshToken = options.revokedRefreshToken ?? "revoked";
  const expiredCursor = options.expiredCursor ?? "expired-sync-token";

  describe(`${kind} adapter contract`, () => {
    let adapters: ProviderAdapters;
    let accessToken: string;

    beforeEach(() => {
      adapters = factory(corpusDir);
      accessToken = token();
    });

    describe("auth", () => {
      const exchange = options.skipAuthExchange ? it.skip : it;
      const revoked = options.skipAuthRevoked ? it.skip : it;

      exchange("exchange yields identity and a refresh token", async () => {
        const result = await adapters.auth.exchangeAuthorizationCode({
          code: "auth-code",
          redirectUri: "https://example.com/sync/google",
        });
        expect(result.account.providerAccountId.length).toBeGreaterThan(0);
        expect(result.refreshToken.length).toBeGreaterThan(0);
      });

      it("refresh mints an access token", async () => {
        const result = await adapters.auth.refreshAccessToken({
          refreshToken,
        });
        expect(result.accessToken.length).toBeGreaterThan(0);
        expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now() - 60_000);
      });

      revoked("revoked grant maps to authorizationRevoked", async () => {
        const error = await adapters.auth
          .refreshAccessToken({ refreshToken: revokedRefreshToken })
          .catch((caught: unknown) => caught);
        expect(error).toBeInstanceOf(ProviderAuthError);
        expect((error as ProviderAuthError).reason).toBe(
          "authorizationRevoked",
        );
      });
    });

    describe("discovery", () => {
      it("detects a primary calendar, colors, access roles, and a cursor", async () => {
        const result = await adapters.calendars.discoverCalendars({
          accessToken,
        });
        const primary = result.calendars.filter((calendar) => calendar.primary);
        expect(primary).toHaveLength(1);
        expect(
          result.calendars.some((calendar) => calendar.color !== null),
        ).toBe(true);
        for (const calendar of result.calendars) {
          expect(ACCESS_ROLES.has(calendar.accessRole)).toBe(true);
        }
        expect(
          result.cursor === null || typeof result.cursor === "string",
        ).toBe(true);
      });
    });

    describe("reader", () => {
      it("pages, yields nextSyncToken only at the end, and counts skipped events", async () => {
        const first = await adapters.reader.listEventPage({
          accessToken,
          calendarId,
        });
        expect(first.skipped).toBeGreaterThanOrEqual(1);

        let page = first;
        let pages = 1;
        while (page.nextPageToken) {
          expect(page.nextSyncToken).toBeNull();
          page = await adapters.reader.listEventPage({
            accessToken,
            calendarId,
            pageToken: page.nextPageToken,
          });
          pages += 1;
        }
        expect(pages).toBeGreaterThanOrEqual(1);
        expect(page.nextPageToken).toBeNull();
        expect(
          page.nextSyncToken === null || typeof page.nextSyncToken === "string",
        ).toBe(true);
      });

      it("maps an expired cursor to cursorExpired", async () => {
        try {
          await adapters.reader.listEventPage({
            accessToken,
            calendarId,
            cursor: expiredCursor,
          });
          throw new Error("expected cursorExpired");
        } catch (caught) {
          expect((caught as ProviderEventReadError).reason).toBe(
            "cursorExpired",
          );
        }
      });

      it("keeps masters and exceptions and does not expand occurrences", async () => {
        const events = await collectEvents(adapters, accessToken, calendarId);
        const masters = events.filter(
          (event) =>
            event.kind === "event" && event.recurrence.kind === "seriesMaster",
        );
        const instances = events.filter(
          (event) =>
            event.kind === "event" && event.recurrence.kind === "instance",
        );
        expect(masters.length).toBeGreaterThanOrEqual(1);
        expect(instances.length).toBeGreaterThanOrEqual(1);
        // A daily series must not be expanded into one row per day.
        expect(instances.length).toBeLessThan(5);
      });
    });

    describe("writer", () => {
      it("create returns id and version, stale patch conflicts, delete is idempotent, fetchInstanceAt resolves", async () => {
        const created = await adapters.writer.createEvent({
          accessToken,
          calendarId,
          providerEventId: CONTRACT_EVENT_ID,
          content: CONTRACT_CONTENT,
          schedule: CONTRACT_SCHEDULE,
          recurrence: { kind: "single" },
          invitation: "none",
        });
        expect(created.providerEventId.length).toBeGreaterThan(0);
        expect(created.providerVersion.length).toBeGreaterThan(0);

        await assertWriterRejectsStaleVersion(adapters.writer, {
          accessToken,
          calendarId,
          skipCreate: true,
          providerEventId: created.providerEventId,
        });

        await adapters.writer.deleteEvent({
          accessToken,
          calendarId,
          providerEventId: created.providerEventId,
          expectedVersion: null,
          invitation: "none",
        });
        await adapters.writer.deleteEvent({
          accessToken,
          calendarId,
          providerEventId: created.providerEventId,
          expectedVersion: null,
          invitation: "none",
        });

        const instance = await adapters.writer.fetchInstanceAt({
          accessToken,
          calendarId,
          seriesProviderEventId: "series-1",
          originalStartAt: "2025-01-15T14:00:00.000Z",
          scheduleKind: "timed",
        });
        expect(instance).not.toBeNull();
        expect(instance?.providerEventId.length).toBeGreaterThan(0);
      });
    });

    describe("notifications", () => {
      const watch = options.skipWatch ? it.skip : it;
      watch("watch returns a channel", async () => {
        const channel = await adapters.notifications.watch({
          accessToken,
          calendarId,
          channelId: "chan-1",
          token: "chan-token",
          callbackUrl: "https://sync.example.com/callbacks/google",
        });
        expect(channel.channelId).toBe("chan-1");
        expect(channel.resourceId.length).toBeGreaterThan(0);
        expect(channel.expiresAt).toBeInstanceOf(Date);
      });

      it("parseNotification accepts a valid callback, rejects tampered, and handles validation", () => {
        const valid = adapters.notifications.parseNotification({
          headers: {
            "x-goog-channel-id": "chan-1",
            "x-goog-channel-token": "chan-token",
            "x-goog-resource-id": "res-1",
            "x-goog-resource-state": "exists",
          },
          body: {},
          query: {},
        });
        expect(valid).not.toBeNull();
        if (valid && "kind" in valid && valid.kind === "validation") {
          throw new Error(
            "valid Google callback must not be a validation handshake",
          );
        }
        expect(valid && "channelId" in valid ? valid.channelId : null).toBe(
          "chan-1",
        );

        const tampered = adapters.notifications.parseNotification({
          headers: { "x-goog-resource-id": "res-1" },
          body: {},
          query: {},
        });
        expect(tampered).toBeNull();

        const validation = adapters.notifications.parseNotification({
          headers: {},
          body: {},
          query: { validationToken: "echo-me" },
        });
        if (
          validation &&
          "kind" in validation &&
          validation.kind === "validation"
        ) {
          expect(validation.body.length).toBeGreaterThan(0);
        } else {
          // Google has no Graph validation handshake; null is the correct miss.
          expect(validation).toBeNull();
        }
      });
    });

    describe("normalizer round-trips", () => {
      it("covers timed, all-day, recurring, exception, cancelled, attendees, conference, and color", async () => {
        const events = await collectEvents(adapters, accessToken, calendarId);
        const active = events.filter((event) => event.kind === "event");
        const cancelled = events.filter(
          (event) => event.kind === "cancellation",
        );

        expect(active.some((event) => event.schedule.kind === "timed")).toBe(
          true,
        );
        expect(active.some((event) => event.schedule.kind === "allDay")).toBe(
          true,
        );
        expect(
          active.some((event) => event.recurrence.kind === "seriesMaster"),
        ).toBe(true);
        expect(
          active.some((event) => event.recurrence.kind === "instance"),
        ).toBe(true);
        expect(cancelled.length).toBeGreaterThanOrEqual(1);
        expect(active.some((event) => event.content.attendees.length > 0)).toBe(
          true,
        );
        expect(active.some((event) => event.content.conference !== null)).toBe(
          true,
        );
        expect(
          active.some(
            (event) =>
              event.content.color !== undefined ||
              event.content.colorHex !== undefined,
          ),
        ).toBe(true);
      });
    });
  });
}

async function collectEvents(
  adapters: ProviderAdapters,
  accessToken: string,
  calendarId: string,
) {
  const events = [];
  let pageToken: string | null = null;
  do {
    const page = await adapters.reader.listEventPage({
      accessToken,
      calendarId,
      pageToken,
    });
    events.push(...page.events);
    pageToken = page.nextPageToken;
  } while (pageToken);
  return events;
}

export async function assertWriterRejectsStaleVersion(
  writer: ProviderEventWriter,
  options: {
    readonly accessToken?: string;
    readonly calendarId?: string;
    readonly skipCreate?: boolean;
    readonly providerEventId?: string;
  } = {},
): Promise<void> {
  const accessToken = options.accessToken ?? "contract-access-token";
  const calendarId = options.calendarId ?? "primary";
  let providerEventId = options.providerEventId ?? CONTRACT_EVENT_ID;

  if (!options.skipCreate) {
    const created = await writer.createEvent({
      accessToken,
      calendarId,
      providerEventId,
      content: CONTRACT_CONTENT,
      schedule: CONTRACT_SCHEDULE,
      recurrence: { kind: "single" },
      invitation: "none",
    });
    providerEventId = created.providerEventId;
  }

  try {
    await writer.patchEvent({
      accessToken,
      calendarId,
      providerEventId,
      expectedVersion: "stale-version-that-must-conflict",
      content: CONTRACT_CONTENT,
      schedule: CONTRACT_SCHEDULE,
      recurrence: { kind: "single" },
      invitation: "none",
    });
  } catch (error) {
    if (
      error instanceof ProviderWriteError &&
      error.reason === "versionConflict"
    ) {
      return;
    }
    const reason =
      error instanceof ProviderWriteError ? error.reason : String(error);
    throw new Error(`expected versionConflict, got ${reason}`);
  }
  throw new Error(
    "writer returned success for a stale expectedVersion; the contract requires versionConflict",
  );
}
