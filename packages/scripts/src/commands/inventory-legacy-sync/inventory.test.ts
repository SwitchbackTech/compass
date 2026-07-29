import {
  inventoryLegacySyncData,
  legacyCursorRows,
} from "@scripts/commands/inventory-legacy-sync/inventory";
import { ObjectId } from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { describe, expect, it } from "bun:test";

const NOW = new Date("2026-07-25T03:00:00.000Z");

describe("inventoryLegacySyncData", () => {
  it("reports deterministic Sync targets and is stable across repeats", () => {
    const userId = new ObjectId("507f1f77bcf86cd799439011");
    const calendarId = new ObjectId("507f1f77bcf86cd799439012");
    const eventLinked = new ObjectId("507f1f77bcf86cd799439013");
    const eventLocal = new ObjectId("507f1f77bcf86cd799439014");

    const input = {
      users: [
        {
          _id: userId,
          email: "alice@example.com",
          firstName: "A",
          lastName: "L",
          name: "A L",
          locale: "en",
          google: {
            googleId: "google-subject-1",
            picture: "",
            gRefreshToken: "refresh-1",
          },
        },
      ],
      calendars: [
        {
          _id: calendarId,
          userId,
          name: "Primary",
          description: "",
          timeZone: "UTC" as const,
          foregroundColor: "#000000" as const,
          backgroundColor: "#ffffff" as const,
          access: "owner" as const,
          isPrimary: true,
          isVisible: true,
          isActive: true,
          source: {
            provider: "google" as const,
            calendarId: "primary",
            etag: "etag-1",
          },
          createdAt: NOW,
          updatedAt: null,
        },
      ],
      events: [
        {
          _id: eventLinked,
          calendarId,
          content: { kind: "details" as const, title: "Meet", description: "" },
          schedule: {
            kind: "timed" as const,
            start: NOW,
            end: new Date(NOW.getTime() + 3600_000),
            timeZone: "UTC" as const,
          },
          recurrence: { kind: "single" as const },
          externalReference: {
            provider: "google" as const,
            eventId: "g-1",
            recurringEventId: null,
          },
          createdAt: NOW,
          updatedAt: null,
        },
        {
          _id: eventLocal,
          calendarId,
          content: {
            kind: "details" as const,
            title: "Local",
            description: "",
          },
          schedule: {
            kind: "timed" as const,
            start: NOW,
            end: new Date(NOW.getTime() + 3600_000),
            timeZone: "UTC" as const,
          },
          recurrence: { kind: "single" as const },
          externalReference: null,
          createdAt: NOW,
          updatedAt: null,
        },
      ],
      syncDocs: [
        {
          _id: new ObjectId("507f1f77bcf86cd799439015"),
          user: userId.toHexString(),
          google: {
            calendarlist: [
              {
                gCalendarId: Resource_Sync.CALENDAR,
                nextSyncToken: "cal-token",
              },
            ],
            events: [{ gCalendarId: "primary", nextSyncToken: "evt-token" }],
          },
        },
      ],
      watches: [
        {
          _id: new ObjectId("507f1f77bcf86cd799439016"),
          user: userId.toHexString(),
          resourceId: "res-cal",
          expiration: String(NOW.getTime() + 86_400_000),
          gCalendarId: Resource_Sync.CALENDAR,
          createdAt: NOW,
        },
        {
          _id: new ObjectId("507f1f77bcf86cd799439017"),
          user: userId.toHexString(),
          resourceId: "res-evt",
          expiration: String(NOW.getTime() + 86_400_000),
          gCalendarId: "primary",
          createdAt: NOW,
        },
      ],
    };

    const first = inventoryLegacySyncData(input, { now: NOW });
    const second = inventoryLegacySyncData(input, { now: NOW });

    expect(first).toEqual(second);
    expect(first.dryRun).toBe(true);
    expect(first.targets).toHaveLength(1);
    expect(first.targets[0]).toMatchObject({
      userId: userId.toHexString(),
      tenantId: userId.toHexString(),
      principalId: userId.toHexString(),
      providerAccountId: "google-subject-1",
      hasRefreshToken: true,
      eventTargets: { linkedGoogle: 1, unlinkedPendingIntent: 1 },
    });
    expect(first.targets[0]?.calendarTargets).toEqual([
      {
        compassCalendarId: calendarId.toHexString(),
        providerCalendarId: "primary",
      },
    ]);
    expect(first.source.users.withRefreshToken).toBe(1);
    expect(first.skips).toEqual([]);
    expect(first.counts.skipped).toBe(0);
  });

  it("categorizes missing authority, orphans, and duplicates", () => {
    const orphanUserId = new ObjectId("507f1f77bcf86cd799439021");
    const userId = new ObjectId("507f1f77bcf86cd799439022");
    const calendarA = new ObjectId("507f1f77bcf86cd799439023");
    const calendarB = new ObjectId("507f1f77bcf86cd799439024");
    const orphanEvent = new ObjectId("507f1f77bcf86cd799439025");

    const report = inventoryLegacySyncData(
      {
        users: [
          {
            _id: userId,
            email: "bob@example.com",
            firstName: "B",
            lastName: "O",
            name: "B O",
            locale: "en",
            google: {
              googleId: "google-subject-2",
              picture: "",
              gRefreshToken: "",
            },
          },
        ],
        calendars: [
          {
            _id: calendarA,
            userId,
            name: "A",
            description: "",
            timeZone: "UTC" as const,
            foregroundColor: "#000000" as const,
            backgroundColor: "#ffffff" as const,
            access: "owner" as const,
            isPrimary: true,
            isVisible: true,
            isActive: true,
            source: {
              provider: "google" as const,
              calendarId: "dup",
              etag: "e1",
            },
            createdAt: NOW,
            updatedAt: null,
          },
          {
            _id: calendarB,
            userId,
            name: "B",
            description: "",
            timeZone: "UTC" as const,
            foregroundColor: "#000000" as const,
            backgroundColor: "#ffffff" as const,
            access: "owner" as const,
            isPrimary: false,
            isVisible: true,
            isActive: true,
            source: {
              provider: "google" as const,
              calendarId: "dup",
              etag: "e2",
            },
            createdAt: NOW,
            updatedAt: null,
          },
          {
            _id: new ObjectId("507f1f77bcf86cd799439026"),
            userId: orphanUserId,
            name: "Orphan cal",
            description: "",
            timeZone: "UTC" as const,
            foregroundColor: "#000000" as const,
            backgroundColor: "#ffffff" as const,
            access: "owner" as const,
            isPrimary: true,
            isVisible: true,
            isActive: true,
            source: { provider: "local" as const },
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        events: [
          {
            _id: orphanEvent,
            calendarId: new ObjectId("507f1f77bcf86cd799439027"),
            content: {
              kind: "details" as const,
              title: "orphan",
              description: "",
            },
            schedule: {
              kind: "timed" as const,
              start: NOW,
              end: new Date(NOW.getTime() + 3600_000),
              timeZone: "UTC" as const,
            },
            recurrence: { kind: "single" as const },
            externalReference: null,
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        syncDocs: [
          {
            _id: new ObjectId("507f1f77bcf86cd799439028"),
            user: orphanUserId.toHexString(),
            google: { calendarlist: [], events: [] },
          },
        ],
        watches: [],
      },
      { now: NOW },
    );

    expect(
      report.skips.some((s) => s.category === "missing_refresh_token"),
    ).toBe(true);
    expect(
      report.skips.some((s) => s.category === "duplicate_google_calendar"),
    ).toBe(true);
    expect(report.skips.some((s) => s.category === "orphan_calendar")).toBe(
      true,
    );
    expect(report.skips.some((s) => s.category === "orphan_event")).toBe(true);
    expect(report.skips.some((s) => s.category === "orphan_sync")).toBe(true);
    expect(report.skips.every((s) => s.category.length > 0)).toBe(true);
  });

  it("accepts array-like objects for nested google cursor rows", () => {
    // Production has a few sync docs where calendarlist was stored as {"0": row}.
    expect(
      legacyCursorRows<{ gCalendarId: string }>({
        0: { gCalendarId: "primary" },
      }),
    ).toEqual([{ gCalendarId: "primary" }]);

    const userId = new ObjectId("507f1f77bcf86cd799439031");
    const calendarId = new ObjectId("507f1f77bcf86cd799439032");
    const report = inventoryLegacySyncData(
      {
        users: [
          {
            _id: userId,
            email: "bob@example.com",
            firstName: "B",
            lastName: "O",
            name: "B O",
            locale: "en",
            google: {
              googleId: "google-subject-2",
              picture: "",
              gRefreshToken: "refresh-2",
            },
          },
        ],
        calendars: [
          {
            _id: calendarId,
            userId,
            name: "Primary",
            description: "",
            timeZone: "UTC" as const,
            foregroundColor: "#000000" as const,
            backgroundColor: "#ffffff" as const,
            access: "owner" as const,
            isPrimary: true,
            isVisible: true,
            isActive: true,
            source: {
              provider: "google" as const,
              calendarId: "primary",
              etag: "etag-1",
            },
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        events: [],
        syncDocs: [
          {
            _id: new ObjectId("507f1f77bcf86cd799439033"),
            user: userId.toHexString(),
            google: {
              calendarlist: {
                0: {
                  gCalendarId: Resource_Sync.CALENDAR,
                  nextSyncToken: "cal-token",
                },
              } as never,
              events: {
                0: { gCalendarId: "primary", nextSyncToken: "ev-token" },
              } as never,
            },
          },
        ],
        watches: [],
      },
      { now: NOW },
    );

    expect(report.source.syncDocs.eventCursorRows).toBe(1);
    expect(report.source.syncDocs.calendarListCursorRows).toBe(1);
    expect(
      report.targets[0]?.syncResourceTargets.some(
        (t) => t.resourceKind === "calendarList" && t.hasCursor,
      ),
    ).toBe(true);
  });
});
