import {
  backfillIdempotencyKey,
  selectBackfillTarget,
} from "@scripts/commands/migrate-pending-intent/map";
import { migratePendingCompassIntent } from "@scripts/commands/migrate-pending-intent/migrate";
import { ObjectId } from "mongodb";
import { describe, expect, it, mock } from "bun:test";

const NOW = new Date("2026-07-25T04:00:00.000Z");
const USER_ID = new ObjectId("507f1f77bcf86cd799439011");
const LOCAL_CAL_ID = new ObjectId("507f1f77bcf86cd799439021");
const TARGET_CAL_ID = "507f1f77bcf86cd799439099";

describe("migrate-pending-intent helpers", () => {
  it("builds create:eventId idempotency keys", () => {
    expect(backfillIdempotencyKey("abc")).toBe("create:abc");
  });

  it("selects primary writable target without using email", () => {
    const selected = selectBackfillTarget(
      [
        {
          _id: "cal-secondary",
          primary: false,
          active: true,
          providerCalendarId: "secondary",
          capabilities: { canWriteEvents: true },
        },
        {
          _id: "cal-primary",
          primary: true,
          active: true,
          providerCalendarId: "primary",
          capabilities: { canWriteEvents: true },
        },
      ] as never,
      {},
    );
    expect(selected.ok && selected.calendar._id).toBe("cal-primary");
  });

  it("rejects a foreign target calendar id", () => {
    const selected = selectBackfillTarget(
      [
        {
          _id: "cal-primary",
          primary: true,
          active: true,
          providerCalendarId: "primary",
          capabilities: { canWriteEvents: true },
        },
      ] as never,
      { targetCalendarId: "someone-elses-calendar" },
    );
    expect(selected.ok).toBe(false);
    if (!selected.ok) expect(selected.reason).toBe("not_owned");
  });
});

describe("migratePendingCompassIntent", () => {
  it("dry-run preserves counts and does not write", async () => {
    const put = mock(() => {
      throw new Error("should not put in dry-run");
    });
    const submit = mock(() => {
      throw new Error("should not submit in dry-run");
    });

    const report = await migratePendingCompassIntent(
      {
        connections: {
          listByPrincipal: async () => [
            {
              _id: "conn-1",
              provider: "google",
              disconnectedAt: null,
            },
          ],
        } as never,
        calendars: {
          listByPrincipal: async () => [
            {
              _id: TARGET_CAL_ID,
              connectionId: "conn-1",
              primary: true,
              active: true,
              providerCalendarId: "primary",
              capabilities: { canWriteEvents: true },
            },
          ],
        } as never,
        events: {
          findById: async () => null,
          put,
        } as never,
        occurrences: {
          replaceForEvent: async () => {
            throw new Error("unused");
          },
        } as never,
        commands: { submit } as never,
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
            _id: LOCAL_CAL_ID,
            userId: USER_ID,
            name: "Local",
            description: "",
            timeZone: "America/Denver",
            foregroundColor: "#000000",
            backgroundColor: "#ffffff",
            access: "owner",
            isPrimary: true,
            isVisible: true,
            isActive: true,
            source: { provider: "local" },
            createdAt: NOW,
            updatedAt: null,
          },
        ],
        events: [
          {
            _id: new ObjectId("507f1f77bcf86cd799439031"),
            calendarId: LOCAL_CAL_ID,
            content: { kind: "details", title: "draft", description: "" },
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
          {
            _id: new ObjectId("507f1f77bcf86cd799439032"),
            calendarId: LOCAL_CAL_ID,
            content: { kind: "details", title: "linked", description: "" },
            schedule: {
              kind: "timed",
              start: NOW,
              end: new Date(NOW.getTime() + 1800_000),
              timeZone: "America/Denver",
            },
            recurrence: { kind: "single" },
            externalReference: {
              provider: "google",
              eventId: "g-1",
              recurringEventId: null,
            },
            createdAt: NOW,
            updatedAt: null,
          },
        ],
      },
      { dryRun: true, now: NOW },
    );

    expect(report.counts.eventsWouldCreate).toBe(1);
    expect(report.counts.commandsWouldCreate).toBe(1);
    expect(report.counts.eventsSkipped).toBe(1);
    expect(report.users[0]?.targetCalendarId).toBe(TARGET_CAL_ID);
    expect(put).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
  });
});
