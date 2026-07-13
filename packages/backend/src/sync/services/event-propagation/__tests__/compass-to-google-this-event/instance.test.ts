import { ObjectId } from "mongodb";
import { type gSchema$EventInstance } from "@core/types/gcal";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { compassTestState } from "@backend/__tests__/helpers/mock.setup";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";
import eventService from "@backend/event/services/event.service";
import {
  buildEventRecord,
  seedGoogleCalendar,
  seedLocalCalendar,
  setupGoogleUser,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";

/**
 * Scope "this" applied to a single series occurrence -- packet 05 step 4
 * closes the "03" gap documented in team/backlog/05-calendar-aware-crud.md:
 * a Compass-created series' materialized instances never get their own
 * externalReference (Google auto-expands them from the base's RRULE), so
 * resolving the Google-side instance id for a scope "this" edit/delete
 * requires an events.instances lookup keyed by the occurrence's ORIGINAL
 * (pre-edit) start -- Google's originalStartTime is fixed for the life of
 * the instance, even after its own start/end are later edited.
 *
 * These tests seed the Google-side instance list directly (via
 * compassTestState) rather than relying on the mock gcal client's own RRULE
 * expansion at series-create time, so each test's "the Google instance the
 * base's RRULE would already have produced" is deterministic and independent
 * of any timezone/rrule-library parity between Compass's and the mock's
 * date math.
 */
describe("CompassToGoogleEventPropagation - scope 'this' - series occurrence", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const seedSeries = async (userId: string, calendarId: string) => {
    const created = await eventService.create(userId, {
      calendarId: calendarId as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
      priority: "unassigned",
    });
    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .sort({ "schedule.start": 1 })
      .toArray();
    // `created` is the pre-Google-effect record returned by create(); its
    // externalReference is only persisted by propagate() after create()
    // already returned, so re-read it to get the real Google eventId.
    const base = await eventService.readById(userId, created._id.toHexString());

    // The mock gcal client's events.insert auto-expands the base's RRULE
    // into its own Google-side instance objects (mirroring what a real
    // series create triggers server-side), but those mock instances carry
    // no originalStartTime and would otherwise crowd out the page (mock
    // pageSize defaults to 3) ahead of the deliberately-seeded instance
    // below. Clear them so each test controls exactly what
    // events.instances returns.
    const state = compassTestState();
    state.events.gcalEvents.all = state.events.gcalEvents.all.filter(
      (event) =>
        (event as { recurringEventId?: string }).recurringEventId !==
        base.externalReference?.eventId,
    );

    return { base, instances };
  };

  /** Registers a Google-side instance matching `start` for the given base. */
  const seedGoogleInstance = (
    recurringEventId: string,
    start: Date,
    id = `gcal-instance-${new ObjectId().toHexString()}`,
  ): gSchema$EventInstance => {
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const instance = {
      id,
      recurringEventId,
      summary: "Weekly sync",
      start: { dateTime: start.toISOString(), timeZone: "America/Denver" },
      end: { dateTime: end.toISOString(), timeZone: "America/Denver" },
      originalStartTime: {
        dateTime: start.toISOString(),
        timeZone: "America/Denver",
      },
    } as unknown as gSchema$EventInstance;

    compassTestState().events.gcalEvents.all.push(instance);
    return instance;
  };

  const timedStart = (event: EventRecord): Date => {
    if (event.schedule.kind !== "timed") {
      throw new Error("expected a timed schedule");
    }
    return event.schedule.start;
  };

  it("resolves the Google instance by its pre-edit start when a not-yet-synced occurrence's time is also edited", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base, instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[1]!;
    const originalStart = timedStart(target);
    const mockInstance = seedGoogleInstance(
      base.externalReference!.eventId,
      originalStart,
    );

    const findInstanceSpy = jest.spyOn(gcalService, "findEventInstance");
    const patchSpy = jest.spyOn(gcalService, "patchEvent");

    await eventService.replace(user._id.toString(), target._id.toHexString(), {
      content: {
        kind: "details",
        title: "Weekly sync (one-off)",
        description: "",
      },
      schedule: {
        kind: "timed",
        start: "2026-07-21T18:00:00-06:00",
        end: "2026-07-21T19:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "this",
    });

    expect(findInstanceSpy).toHaveBeenCalledTimes(1);
    const [, calendarIdArg, recurringEventIdArg, anchorArg] =
      findInstanceSpy.mock.calls[0]!;
    expect(calendarIdArg).toBe(calendar.source.calendarId);
    expect(recurringEventIdArg).toBe(base.externalReference!.eventId);
    // The pre-edit start, NOT the new 18:00 time this same call is applying.
    expect((anchorArg as Date).getTime()).toBe(originalStart.getTime());

    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, patchCalendarIdArg, patchEventIdArg, patchBody] =
      patchSpy.mock.calls[0]!;
    expect(patchCalendarIdArg).toBe(calendar.source.calendarId);
    expect(patchEventIdArg).toBe(mockInstance.id);
    expect(patchBody).toMatchObject({ summary: "Weekly sync (one-off)" });

    const persisted = await eventService.readById(
      user._id.toString(),
      target._id.toHexString(),
    );
    expect(persisted.externalReference).toMatchObject({
      provider: "google",
      eventId: mockInstance.id,
      recurringEventId: base.externalReference!.eventId,
    });
  });

  it("resolves the Google instance by its current start when a not-yet-synced, never-edited occurrence is deleted", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base, instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[0]!;
    const originalStart = timedStart(target);
    const mockInstance = seedGoogleInstance(
      base.externalReference!.eventId,
      originalStart,
    );

    const findInstanceSpy = jest.spyOn(gcalService, "findEventInstance");
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    await eventService.delete(user._id.toString(), target._id.toHexString(), {
      scope: "this",
    });

    expect(findInstanceSpy).toHaveBeenCalledTimes(1);
    const [, , , anchorArg] = findInstanceSpy.mock.calls[0]!;
    expect((anchorArg as Date).getTime()).toBe(originalStart.getTime());

    expect(deleteSpy).toHaveBeenCalledTimes(1);
    const [, deleteCalendarIdArg, deleteEventIdArg] = deleteSpy.mock.calls[0]!;
    expect(deleteCalendarIdArg).toBe(calendar.source.calendarId);
    expect(deleteEventIdArg).toBe(mockInstance.id);

    await expect(
      eventService.readById(user._id.toString(), target._id.toHexString()),
    ).rejects.toMatchObject({ mutationCode: "EVENT_NOT_FOUND" });
  });

  it("does not look up events.instances again once an occurrence's externalReference is already resolved", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base, instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[2]!;
    const mockInstance = seedGoogleInstance(
      base.externalReference!.eventId,
      timedStart(target),
    );

    // First edit resolves and persists the externalReference.
    await eventService.replace(user._id.toString(), target._id.toHexString(), {
      content: { kind: "details", title: "First edit", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-28T15:00:00-06:00",
        end: "2026-07-28T16:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "this",
    });

    const findInstanceSpy = jest.spyOn(gcalService, "findEventInstance");
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    findInstanceSpy.mockClear();
    patchSpy.mockClear();

    // Second edit: externalReference is already set, so no lookup is needed.
    await eventService.replace(user._id.toString(), target._id.toHexString(), {
      content: { kind: "details", title: "Second edit", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-28T20:00:00-06:00",
        end: "2026-07-28T21:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "preserve" },
      priority: "unassigned",
      scope: "this",
    });

    expect(findInstanceSpy).not.toHaveBeenCalled();
    expect(patchSpy).toHaveBeenCalledTimes(1);
    const [, , eventIdArg, body] = patchSpy.mock.calls[0]!;
    expect(eventIdArg).toBe(mockInstance.id);
    expect(body).toMatchObject({ summary: "Second edit" });
  });

  it("silently skips Google sync for an occurrence whose series base was never synced to Google", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedLocalCalendar(user._id);
    const base = buildEventRecord(calendar._id, {
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=5"] },
    });
    const occurrence = buildEventRecord(calendar._id, {
      recurrence: { kind: "occurrence", seriesId: base._id },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-21T15:00:00.000Z"),
        end: new Date("2026-07-21T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
    });
    await mongoService.event.insertMany([base, occurrence]);

    const findInstanceSpy = jest.spyOn(gcalService, "findEventInstance");
    const patchSpy = jest.spyOn(gcalService, "patchEvent");
    const createSpy = jest.spyOn(gcalService, "createEvent");
    const deleteSpy = jest.spyOn(gcalService, "deleteEvent");

    await eventService.replace(
      user._id.toString(),
      occurrence._id.toHexString(),
      {
        content: { kind: "details", title: "Edited", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-07-21T18:00:00-06:00",
          end: "2026-07-21T19:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        priority: "unassigned",
        scope: "this",
      },
    );

    expect(findInstanceSpy).not.toHaveBeenCalled();
    expect(patchSpy).not.toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
  });

  it("does not throw and does not write to Google when events.instances has no matching instance", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { instances } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );
    const target = instances[0]!;
    // No Google-side instance seeded -- the lookup will find nothing.

    const patchSpy = jest.spyOn(gcalService, "patchEvent");

    await expect(
      eventService.replace(user._id.toString(), target._id.toHexString(), {
        content: {
          kind: "details",
          title: "Weekly sync (one-off)",
          description: "",
        },
        schedule: {
          kind: "timed",
          start: "2026-07-21T18:00:00-06:00",
          end: "2026-07-21T19:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        priority: "unassigned",
        scope: "this",
      }),
    ).resolves.toMatchObject({ content: { title: "Weekly sync (one-off)" } });

    expect(patchSpy).not.toHaveBeenCalled();

    const persisted = await eventService.readById(
      user._id.toString(),
      target._id.toHexString(),
    );
    expect(persisted.externalReference).toBeNull();
  });

  it("rejects editing the series base itself with scope 'this' (RECURRENCE_CONFLICT, B6)", async () => {
    const { user } = await setupGoogleUser();
    const calendar = await seedGoogleCalendar(user._id);
    const { base } = await seedSeries(
      user._id.toString(),
      calendar._id.toHexString(),
    );

    await expect(
      eventService.replace(user._id.toString(), base._id.toHexString(), {
        content: { kind: "details", title: "Nope", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        priority: "unassigned",
        scope: "this",
      }),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });
  });
});
