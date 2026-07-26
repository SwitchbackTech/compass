import {
  capabilitiesForAccess,
  mapAccessRole,
  planSyncRecurrence,
  toSyncContent,
  toSyncSchedule,
} from "@scripts/commands/migrate-provider-state/map";
import { migrateProviderSyncState } from "@scripts/commands/migrate-provider-state/migrate";
import { ObjectId } from "mongodb";
import { describe, expect, it, mock } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");
const USER_ID = new ObjectId("507f1f77bcf86cd799439011");
const CONNECTION_ID = "507f1f77bcf86cd799439099";
const CALENDAR_ID = new ObjectId("507f1f77bcf86cd799439021");

describe("migrate-provider-state map helpers", () => {
  it("maps legacy access roles like the Google calendar adapter", () => {
    expect(mapAccessRole("owner")).toBe("owner");
    expect(mapAccessRole("writer")).toBe("editor");
    expect(mapAccessRole("reader")).toBe("viewer");
    expect(mapAccessRole("freeBusyReader")).toBe("busyOnly");
    expect(capabilitiesForAccess("writer").canWriteEvents).toBe(true);
    expect(capabilitiesForAccess("reader").canWriteEvents).toBe(false);
  });

  it("maps content and timed schedules", () => {
    expect(
      toSyncContent({
        kind: "details",
        title: "standup",
        description: "notes",
      }),
    ).toEqual({
      title: "standup",
      description: "notes",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    });
    expect(toSyncContent({ kind: "busy" }).title).toBe("");
    expect(
      toSyncSchedule({
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 1800_000),
        timeZone: "America/Denver",
      }),
    ).toEqual({
      kind: "timed",
      start: "2026-07-25T04:00:00.000Z",
      end: "2026-07-25T04:30:00.000Z",
      timeZone: "America/Denver",
    });
    expect(() =>
      toSyncSchedule({
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() - 1800_000),
        timeZone: "UTC",
      }),
    ).toThrow(/end must be after start/i);
  });

  it("plans series masters and occurrences", () => {
    const masterPlan = planSyncRecurrence({
      _id: new ObjectId(),
      calendarId: CALENDAR_ID,
      content: { kind: "details", title: "series", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 1800_000),
        timeZone: "UTC",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
      externalReference: {
        provider: "google",
        eventId: "master-1",
        recurringEventId: null,
      },
      createdAt: NOW,
      updatedAt: null,
    });
    expect(masterPlan.ok && !masterPlan.needsMaster).toBe(true);
    if (masterPlan.ok && !masterPlan.needsMaster) {
      expect(masterPlan.recurrence).toEqual({
        kind: "seriesMaster",
        rules: ["RRULE:FREQ=WEEKLY"],
      });
    }

    const occurrencePlan = planSyncRecurrence({
      _id: new ObjectId(),
      calendarId: CALENDAR_ID,
      content: { kind: "details", title: "exception", description: "" },
      schedule: {
        kind: "timed",
        start: NOW,
        end: new Date(NOW.getTime() + 1800_000),
        timeZone: "UTC",
      },
      recurrence: { kind: "occurrence", seriesId: new ObjectId() },
      externalReference: {
        provider: "google",
        eventId: "instance-1",
        recurringEventId: "master-1",
      },
      createdAt: NOW,
      updatedAt: null,
    });
    expect(occurrencePlan.ok && occurrencePlan.needsMaster).toBe(true);
  });
});

describe("migrateProviderSyncState", () => {
  it("dry-run skips users without a Sync connection and does not write", async () => {
    const upsertCalendar = mock(() => {
      throw new Error("should not upsert calendar in dry-run");
    });
    const upsertEvent = mock(() => {
      throw new Error("should not upsert event in dry-run");
    });
    const ensure = mock(() => {
      throw new Error("should not ensure resource in dry-run");
    });

    const report = await migrateProviderSyncState(
      {
        connections: {
          listByPrincipal: async () => [],
        } as never,
        calendars: {
          listByConnection: async () => [],
          upsertByProviderCalendar: upsertCalendar,
        } as never,
        events: {
          findByProviderIdentity: async () => null,
          upsertByProviderIdentity: upsertEvent,
        } as never,
        occurrences: {
          replaceForEvent: async () => {
            throw new Error("unused");
          },
        } as never,
        resources: {
          listByConnection: async () => [],
          ensure,
          advanceCursor: async () => {
            throw new Error("unused");
          },
        } as never,
      },
      {
        users: [
          {
            _id: USER_ID,
            email: "alice@example.com",
            firstName: "A",
            lastName: "Lice",
            name: "A Lice",
            locale: "en",
            google: {
              googleId: "google-1",
              picture: "",
              gRefreshToken: "refresh",
            },
          },
        ],
        calendars: [],
        events: [],
        syncDocs: [],
        watches: [],
      },
      { dryRun: true, now: NOW },
    );

    expect(report.counts.usersSkipped).toBe(1);
    expect(report.users[0]?.skipCategory).toBe("missing_connection");
    expect(upsertCalendar).not.toHaveBeenCalled();
    expect(upsertEvent).not.toHaveBeenCalled();
    expect(ensure).not.toHaveBeenCalled();
  });

  it("dry-run reports would_migrate when a connection exists", async () => {
    const report = await migrateProviderSyncState(
      {
        connections: {
          listByPrincipal: async () => [
            {
              _id: CONNECTION_ID,
              provider: "google",
              account: { providerAccountId: "google-1" },
              disconnectedAt: null,
            },
          ],
        } as never,
        calendars: {
          listByConnection: async () => [],
          upsertByProviderCalendar: async () => {
            throw new Error("dry-run");
          },
        } as never,
        events: {
          findByProviderIdentity: async () => null,
          upsertByProviderIdentity: async () => {
            throw new Error("dry-run");
          },
        } as never,
        occurrences: { replaceForEvent: async () => undefined } as never,
        resources: {
          listByConnection: async () => [],
          ensure: async () => {
            throw new Error("dry-run");
          },
          advanceCursor: async () => {
            throw new Error("dry-run");
          },
        } as never,
      },
      {
        users: [
          {
            _id: USER_ID,
            email: "alice@example.com",
            firstName: "A",
            lastName: "Lice",
            name: "A Lice",
            locale: "en",
            google: {
              googleId: "google-1",
              picture: "",
              gRefreshToken: "refresh",
            },
          },
        ],
        calendars: [
          {
            _id: CALENDAR_ID,
            userId: USER_ID,
            name: "Primary",
            description: "",
            timeZone: "America/Denver",
            foregroundColor: "#000000",
            backgroundColor: "#ffffff",
            access: "owner",
            isPrimary: true,
            isVisible: true,
            isActive: true,
            source: {
              provider: "google",
              calendarId: "primary",
              etag: "etag-1",
            },
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        events: [
          {
            _id: new ObjectId("507f1f77bcf86cd799439031"),
            calendarId: CALENDAR_ID,
            content: { kind: "details", title: "standup", description: "" },
            schedule: {
              kind: "timed",
              start: NOW,
              end: new Date(NOW.getTime() + 1800_000),
              timeZone: "America/Denver",
            },
            recurrence: { kind: "single" },
            externalReference: {
              provider: "google",
              eventId: "gcal-evt-1",
              recurringEventId: null,
            },
            createdAt: NOW,
            updatedAt: null,
          },
          {
            _id: new ObjectId("507f1f77bcf86cd799439033"),
            calendarId: CALENDAR_ID,
            content: { kind: "details", title: "weekly", description: "" },
            schedule: {
              kind: "timed",
              start: NOW,
              end: new Date(NOW.getTime() + 3600_000),
              timeZone: "America/Denver",
            },
            recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
            externalReference: {
              provider: "google",
              eventId: "gcal-master-1",
              recurringEventId: null,
            },
            createdAt: NOW,
            updatedAt: null,
          },
          {
            _id: new ObjectId("507f1f77bcf86cd799439034"),
            calendarId: CALENDAR_ID,
            content: {
              kind: "details",
              title: "weekly (moved)",
              description: "",
            },
            schedule: {
              kind: "timed",
              start: new Date(NOW.getTime() + 86_400_000),
              end: new Date(NOW.getTime() + 86_400_000 + 3600_000),
              timeZone: "America/Denver",
            },
            recurrence: {
              kind: "occurrence",
              seriesId: new ObjectId("507f1f77bcf86cd799439033"),
            },
            externalReference: {
              provider: "google",
              eventId: "gcal-exception-1",
              recurringEventId: "gcal-master-1",
            },
            createdAt: NOW,
            updatedAt: null,
          },
          {
            _id: new ObjectId("507f1f77bcf86cd799439032"),
            calendarId: CALENDAR_ID,
            content: { kind: "details", title: "local only", description: "" },
            schedule: {
              kind: "timed",
              start: NOW,
              end: new Date(NOW.getTime() + 1800_000),
              timeZone: "America/Denver",
            },
            recurrence: { kind: "single" },
            externalReference: null,
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        syncDocs: [
          {
            user: USER_ID.toHexString(),
            google: {
              calendarlist: [
                { gCalendarId: "calendarlist", nextSyncToken: "cal-sync" },
              ],
              events: [{ gCalendarId: "primary", nextSyncToken: "evt-sync" }],
            },
          },
        ],
        watches: [
          {
            _id: new ObjectId("507f1f77bcf86cd799439041"),
            user: USER_ID.toHexString(),
            resourceId: "resource-1",
            expiration: String(NOW.getTime() + 86_400_000),
            gCalendarId: "primary",
            createdAt: NOW,
          },
        ],
      },
      { dryRun: true, now: NOW },
    );

    expect(report.dryRun).toBe(true);
    expect(report.counts.usersWouldMigrate).toBe(1);
    expect(report.counts.calendarsWouldCreate).toBe(1);
    expect(report.counts.eventsWouldCreate).toBe(3);
    expect(report.counts.unlinkedDeferred).toBe(1);
    expect(report.counts.watchesSkippedRewatch).toBe(1);
    expect(
      report.skips.some((s) => s.category === "subscription_requires_rewatch"),
    ).toBe(true);
    expect(report.skips.some((s) => s.category === "unlinked_deferred")).toBe(
      true,
    );
    expect(
      report.skips.some((s) => s.category === "missing_series_master"),
    ).toBe(false);
  });
});
