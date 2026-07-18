import { ObjectId } from "mongodb";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { sseServer } from "@backend/servers/sse/sse.server";
import {
  buildEventRecord,
  seedGoogleCalendar,
} from "@backend/sync/services/event-propagation/__tests__/event-propagation.test-helpers";

const seedLocalCalendar = async (userId: ObjectId) => {
  const record = CalendarRecordSchema.parse({
    _id: new ObjectId(),
    userId,
    name: "Compass",
    description: "",
    timeZone: null,
    foregroundColor: "#000000",
    backgroundColor: "#ffffff",
    access: "owner",
    isPrimary: false,
    isVisible: true,
    isActive: true,
    source: { provider: "local" },
    createdAt: new Date(),
    updatedAt: null,
  });
  await mongoService.calendar.insertOne(record);
  return record;
};

describe("EventService (local calendar)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("creates a standalone timed event", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    expect(created.content).toEqual({
      kind: "details",
      title: "Standup",
      description: "",
    });

    const found = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(found._id).toEqual(created._id);
  });

  it("rejects a duplicate client-supplied id", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);
    const id = new ObjectId().toHexString();

    const input = {
      id: id as never,
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details" as const, title: "Standup", description: "" },
      schedule: {
        kind: "timed" as const,
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver" as never,
      },
      recurrence: { kind: "single" as const },
    };

    await eventService.create(user._id.toString(), input);

    await expect(
      eventService.create(user._id.toString(), input),
    ).rejects.toMatchObject({ mutationCode: "DUPLICATE_EVENT_ID" });
  });

  it("materializes instances for a series create", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });

    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .toArray();

    expect(instances).toHaveLength(3);
  });

  it("deletes a standalone event", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "this",
    });

    await expect(
      eventService.readById(user._id.toString(), created._id.toHexString()),
    ).rejects.toMatchObject({ mutationCode: "EVENT_NOT_FOUND" });
  });

  it("readAll returns events for a range query scoped to the user's calendars", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    const results = await eventService.readAll(user._id.toString(), {
      kind: "range",
      start: "2026-07-14T00:00:00Z",
      end: "2026-07-15T00:00:00Z",
    });

    expect(results.map((e) => e._id.toHexString())).toContain(
      created._id.toHexString(),
    );
  });

  it("rejects deleting a series base directly with scope 'this'", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });

    await expect(
      eventService.delete(user._id.toString(), created._id.toHexString(), {
        scope: "this",
      }),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });
  });

  it("delete scope 'all' removes the whole series (base and every instance)", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });

    const before = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .toArray();
    expect(before).toHaveLength(3);

    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "all",
    });

    const remaining = await mongoService.event
      .find({
        $or: [{ _id: created._id }, { "recurrence.seriesId": created._id }],
      })
      .toArray();
    expect(remaining).toHaveLength(0);
  });

  it("delete scope 'thisAndFollowing' truncates the series and keeps earlier instances", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Weekly sync", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });

    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .sort({ "schedule.start": 1 })
      .toArray();
    expect(instances).toHaveLength(3);
    const [earliest, middle, latest] = instances;

    await eventService.delete(user._id.toString(), latest!._id.toHexString(), {
      scope: "thisAndFollowing",
    });

    const remainingInstanceIds = (
      await mongoService.event
        .find({ "recurrence.seriesId": created._id })
        .toArray()
    ).map((e) => e._id.toHexString());

    expect(remainingInstanceIds.sort()).toEqual(
      [earliest!._id.toHexString(), middle!._id.toHexString()].sort(),
    );
    expect(
      await eventService.readById(
        user._id.toString(),
        created._id.toHexString(),
      ),
    ).toBeTruthy();
  });
});

describe("EventService (calendar write-capability enforcement)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  const createInput = (calendarId: string) => ({
    calendarId: calendarId as never,
    content: { kind: "details" as const, title: "Standup", description: "" },
    schedule: {
      kind: "timed" as const,
      start: "2026-07-14T15:00:00-06:00",
      end: "2026-07-14T16:00:00-06:00",
      timeZone: "America/Denver" as never,
    },
    recurrence: { kind: "single" as const },
  });

  const replaceInput = () => ({
    content: { kind: "details" as const, title: "Updated", description: "" },
    schedule: {
      kind: "timed" as const,
      start: "2026-07-14T15:00:00-06:00",
      end: "2026-07-14T16:00:00-06:00",
      timeZone: "America/Denver" as never,
    },
    recurrence: { kind: "single" as const },
    scope: "this" as const,
  });

  it("create succeeds on a writer calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "writer" });

    const created = await eventService.create(
      user._id.toString(),
      createInput(calendar._id.toHexString()),
    );

    expect(created.calendarId).toEqual(calendar._id);
  });

  it("create fails with CALENDAR_READ_ONLY on a reader calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "reader" });

    await expect(
      eventService.create(
        user._id.toString(),
        createInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_READ_ONLY" });
  });

  it("create fails with CALENDAR_READ_ONLY on a freeBusyReader calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, {
      access: "freeBusyReader",
    });

    await expect(
      eventService.create(
        user._id.toString(),
        createInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_READ_ONLY" });
  });

  it("create fails with CALENDAR_NOT_FOUND for a cross-user calendar id", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const { user: otherUser } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(otherUser._id, {
      access: "writer",
    });

    await expect(
      eventService.create(
        user._id.toString(),
        createInput(calendar._id.toHexString()),
      ),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_NOT_FOUND" });
  });

  it("create fails with CALENDAR_NOT_FOUND for a stale calendar id", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const staleId = new ObjectId().toHexString();

    await expect(
      eventService.create(user._id.toString(), createInput(staleId)),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_NOT_FOUND" });
  });

  it("replace succeeds on an existing event on a writer calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "writer" });
    const event = buildEventRecord(calendar._id);
    await mongoService.event.insertOne(event);

    const replaced = await eventService.replace(
      user._id.toString(),
      event._id.toHexString(),
      replaceInput() as never,
    );

    expect(replaced.content).toEqual({
      kind: "details",
      title: "Updated",
      description: "",
    });
  });

  it("replace fails with CALENDAR_READ_ONLY on an existing event on a reader calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "reader" });
    const event = buildEventRecord(calendar._id);
    await mongoService.event.insertOne(event);

    await expect(
      eventService.replace(
        user._id.toString(),
        event._id.toHexString(),
        replaceInput() as never,
      ),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_READ_ONLY" });
  });

  it("delete succeeds on an existing event on a writer calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "writer" });
    const event = buildEventRecord(calendar._id);
    await mongoService.event.insertOne(event);

    await eventService.delete(user._id.toString(), event._id.toHexString(), {
      scope: "this",
    });

    await expect(
      eventService.readById(user._id.toString(), event._id.toHexString()),
    ).rejects.toMatchObject({ mutationCode: "EVENT_NOT_FOUND" });
  });

  it("delete fails with CALENDAR_READ_ONLY on an existing event on a reader calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedGoogleCalendar(user._id, { access: "reader" });
    const event = buildEventRecord(calendar._id);
    await mongoService.event.insertOne(event);

    await expect(
      eventService.delete(user._id.toString(), event._id.toHexString(), {
        scope: "this",
      }),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_READ_ONLY" });

    expect(
      await eventService.readById(user._id.toString(), event._id.toHexString()),
    ).toBeTruthy();
  });
});

/**
 * Packet 05 step 7: A6 makes calendar assignment immutable and every
 * materialized instance copies its base's calendarId, so no code path
 * reachable through the public API can construct a series whose instances
 * span more than one calendar. This is defense-in-depth for that invariant
 * having somehow been violated anyway (a bad migration, a hand-edited
 * document, ...) -- seeded directly via Mongo, not through create/replace,
 * since the public API is exactly what's supposed to make this unreachable.
 */
describe("EventService (series-calendar consistency guard, step 7)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("fails loudly (RECURRENCE_CONFLICT) on a scope 'all' delete when an instance has drifted onto a different calendar than its base", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendarA = await seedLocalCalendar(user._id);
    const calendarB = await seedLocalCalendar(user._id);

    const base = buildEventRecord(calendarA._id, {
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const driftedInstance = buildEventRecord(calendarB._id, {
      recurrence: { kind: "occurrence", seriesId: base._id },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-21T15:00:00.000Z"),
        end: new Date("2026-07-21T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
    });
    await mongoService.event.insertOne(base);
    await mongoService.event.insertOne(driftedInstance);

    await expect(
      eventService.delete(user._id.toString(), base._id.toHexString(), {
        scope: "all",
      }),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });

    // Nothing should have been deleted -- the guard fires before any write.
    expect(await mongoService.event.findOne({ _id: base._id })).toBeTruthy();
    expect(
      await mongoService.event.findOne({ _id: driftedInstance._id }),
    ).toBeTruthy();
  });

  it("fails loudly (RECURRENCE_CONFLICT) on a scope 'all' replace when an instance has drifted onto a different calendar than its base", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendarA = await seedLocalCalendar(user._id);
    const calendarB = await seedLocalCalendar(user._id);

    const base = buildEventRecord(calendarA._id, {
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const driftedInstance = buildEventRecord(calendarB._id, {
      recurrence: { kind: "occurrence", seriesId: base._id },
      schedule: {
        kind: "timed",
        start: new Date("2026-07-21T15:00:00.000Z"),
        end: new Date("2026-07-21T16:00:00.000Z"),
        timeZone: "America/Denver",
      },
    });
    await mongoService.event.insertOne(base);
    await mongoService.event.insertOne(driftedInstance);

    await expect(
      eventService.replace(user._id.toString(), base._id.toHexString(), {
        content: { kind: "details", title: "Renamed", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        scope: "all",
      }),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });
  });
});

/**
 * Packet 05 step 9: `notify()` (event.service.ts) suppresses the
 * `eventsChanged` SSE push for calendars the user has hidden -- the web has
 * nothing rendered for an invisible calendar, so there's no client state for
 * that push to reconcile.
 */
describe("EventService (SSE suppression for invisible calendars, step 9)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("does not publish eventsChanged for a create on a hidden calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);
    await mongoService.calendar.updateOne(
      { _id: calendar._id },
      { $set: { isVisible: false } },
    );
    const publishSpy = jest.spyOn(sseServer, "publishEventsChanged");

    await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Hidden event", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    expect(publishSpy).not.toHaveBeenCalled();
  });

  it("publishes eventsChanged for a create on a visible calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);
    const publishSpy = jest.spyOn(sseServer, "publishEventsChanged");

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Visible event", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    expect(publishSpy).toHaveBeenCalledWith(
      user._id.toString(),
      expect.objectContaining({
        calendarId: calendar._id.toHexString(),
        eventIds: [created._id.toHexString()],
        reason: "created",
      }),
    );
  });

  it("fails open (still publishes) when a touched calendar record's visibility lookup comes back empty", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    // Simulate the notify() visibility lookup racing a calendar record that
    // vanished out from under it -- only the `_id: { $in: [...] }` query
    // notify() runs is stubbed to come back empty; every other `find` call
    // (e.g. calendarService.list's ownership checks) passes through
    // untouched. notify() should still publish rather than silently drop it.
    const originalFind = mongoService.calendar.find.bind(mongoService.calendar);
    jest
      .spyOn(mongoService.calendar, "find")
      .mockImplementation(
        (...args: Parameters<typeof mongoService.calendar.find>) => {
          const [filter] = args;
          const idFilter = (filter as { _id?: { $in?: unknown[] } } | undefined)
            ?._id?.$in;
          if (idFilter) {
            return { toArray: async () => [] } as ReturnType<
              typeof mongoService.calendar.find
            >;
          }
          return originalFind(...args);
        },
      );
    const publishSpy = jest.spyOn(sseServer, "publishEventsChanged");

    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "this",
    });

    expect(publishSpy).toHaveBeenCalledWith(
      user._id.toString(),
      expect.objectContaining({ calendarId: calendar._id.toHexString() }),
    );
  });
});

/**
 * Packet 08 step 4: `readAll` (list reads) only ever surfaces events on
 * calendars the user has left visible. Hiding a calendar is presentation-only
 * (A8) -- it must not affect ownership, so mutation/lookup paths keep working
 * on a hidden calendar's events even though list reads no longer return them.
 */
describe("EventService (visibility filtering for list reads, packet 08)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("excludes a hidden calendar's events from a range list read", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const visible = await seedLocalCalendar(user._id);
    const hidden = await seedGoogleCalendar(user._id, { access: "writer" });
    await mongoService.calendar.updateOne(
      { _id: hidden._id },
      { $set: { isVisible: false } },
    );

    const visibleEvent = await eventService.create(user._id.toString(), {
      calendarId: visible._id.toHexString() as never,
      content: { kind: "details", title: "Visible standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });
    const hiddenEvent = await eventService.create(user._id.toString(), {
      calendarId: hidden._id.toHexString() as never,
      content: { kind: "details", title: "Hidden standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T17:00:00-06:00",
        end: "2026-07-14T18:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    const results = await eventService.readAll(user._id.toString(), {
      kind: "range",
      start: "2026-07-14T00:00:00Z",
      end: "2026-07-15T00:00:00Z",
    });
    const resultIds = results.map((e) => e._id.toHexString());

    expect(resultIds).toContain(visibleEvent._id.toHexString());
    expect(resultIds).not.toContain(hiddenEvent._id.toHexString());
  });

  it("still allows mutating an event on a hidden calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Standup", description: "" },
      schedule: {
        kind: "timed",
        start: "2026-07-14T15:00:00-06:00",
        end: "2026-07-14T16:00:00-06:00",
        timeZone: "America/Denver",
      },
      recurrence: { kind: "single" },
    });

    await mongoService.calendar.updateOne(
      { _id: calendar._id },
      { $set: { isVisible: false } },
    );

    const replaced = await eventService.replace(
      user._id.toString(),
      created._id.toHexString(),
      {
        content: { kind: "details", title: "Renamed", description: "" },
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver" as never,
        },
        recurrence: { kind: "preserve" },
        scope: "all",
      },
    );

    expect(replaced.content).toEqual({
      kind: "details",
      title: "Renamed",
      description: "",
    });

    await expect(
      eventService.delete(user._id.toString(), created._id.toHexString(), {
        scope: "this",
      }),
    ).resolves.toBeUndefined();
  });
});

/**
 * Cross-calendar move (drag between Day-view columns): a replace whose
 * calendarId differs from the event's current calendar re-homes a single
 * event. Moves supersede A6's calendar-immutability for single events only;
 * recurring events are rejected before any write.
 */
describe("EventService (cross-calendar move)", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterEach(() => jest.restoreAllMocks());
  afterAll(cleanupTestDb);

  const moveInput = (calendarId: string) => ({
    calendarId: calendarId as never,
    content: { kind: "details" as const, title: "Moved", description: "" },
    schedule: {
      kind: "timed" as const,
      start: "2026-07-14T15:00:00-06:00",
      end: "2026-07-14T16:00:00-06:00",
      timeZone: "America/Denver" as never,
    },
    recurrence: { kind: "preserve" as const },
    scope: "this" as const,
  });

  it("moves a single event to the destination calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedLocalCalendar(user._id);
    const destination = await seedLocalCalendar(user._id);
    const event = buildEventRecord(source._id);
    await mongoService.event.insertOne(event);

    const replaced = await eventService.replace(
      user._id.toString(),
      event._id.toHexString(),
      moveInput(destination._id.toHexString()) as never,
    );

    expect(replaced.calendarId).toEqual(destination._id);

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(destination._id);
  });

  it("treats a matching calendarId as a plain replace, not a move", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);
    const event = buildEventRecord(calendar._id);
    await mongoService.event.insertOne(event);

    const replaced = await eventService.replace(
      user._id.toString(),
      event._id.toHexString(),
      moveInput(calendar._id.toHexString()) as never,
    );

    expect(replaced.calendarId).toEqual(calendar._id);
    expect(replaced.content.kind === "details" && replaced.content.title).toBe(
      "Moved",
    );
  });

  it("rejects a move for a recurring event with RECURRENCE_CONFLICT", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedLocalCalendar(user._id);
    const destination = await seedLocalCalendar(user._id);
    const event = buildEventRecord(source._id, {
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    await mongoService.event.insertOne(event);

    await expect(
      eventService.replace(
        user._id.toString(),
        event._id.toHexString(),
        moveInput(destination._id.toHexString()) as never,
      ),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(source._id);
  });

  it("rejects a move that also converts the event to a series", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedLocalCalendar(user._id);
    const destination = await seedLocalCalendar(user._id);
    const event = buildEventRecord(source._id);
    await mongoService.event.insertOne(event);

    await expect(
      eventService.replace(user._id.toString(), event._id.toHexString(), {
        ...moveInput(destination._id.toHexString()),
        recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
      } as never),
    ).rejects.toMatchObject({ mutationCode: "RECURRENCE_CONFLICT" });

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(source._id);
  });

  it("rejects moving a Google event onto a non-Google calendar", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedGoogleCalendar(user._id, { access: "owner" });
    const destination = await seedLocalCalendar(user._id);
    const event = buildEventRecord(source._id, {
      externalReference: {
        provider: "google",
        eventId: "google-event-1",
        recurringEventId: null,
      },
    });
    await mongoService.event.insertOne(event);

    await expect(
      eventService.replace(
        user._id.toString(),
        event._id.toHexString(),
        moveInput(destination._id.toHexString()) as never,
      ),
    ).rejects.toMatchObject({ mutationCode: "PROVIDER_FAILURE" });

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(source._id);
  });

  it("reverts the calendar when Google refuses the move", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedGoogleCalendar(user._id, { access: "owner" });
    const destination = await seedGoogleCalendar(user._id, {
      access: "writer",
      isPrimary: false,
    });
    const event = buildEventRecord(source._id, {
      externalReference: {
        provider: "google",
        eventId: "google-event-1",
        recurringEventId: null,
      },
    });
    await mongoService.event.insertOne(event);

    jest
      .spyOn(gcalService, "moveEvent")
      .mockRejectedValue(new Error("cannotChangeOrganizer"));

    await expect(
      eventService.replace(
        user._id.toString(),
        event._id.toHexString(),
        moveInput(destination._id.toHexString()) as never,
      ),
    ).rejects.toMatchObject({ mutationCode: "PROVIDER_FAILURE" });

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(source._id);
  });

  it("rejects a move to a read-only destination with CALENDAR_READ_ONLY", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedLocalCalendar(user._id);
    const destination = await seedGoogleCalendar(user._id, {
      access: "reader",
    });
    const event = buildEventRecord(source._id);
    await mongoService.event.insertOne(event);

    await expect(
      eventService.replace(
        user._id.toString(),
        event._id.toHexString(),
        moveInput(destination._id.toHexString()) as never,
      ),
    ).rejects.toMatchObject({ mutationCode: "CALENDAR_READ_ONLY" });

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.calendarId).toEqual(source._id);
  });

  it("publishes eventsChanged for both the source and destination calendars", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedLocalCalendar(user._id);
    const destination = await seedLocalCalendar(user._id);
    const event = buildEventRecord(source._id);
    await mongoService.event.insertOne(event);
    const publishSpy = jest.spyOn(sseServer, "publishEventsChanged");

    await eventService.replace(
      user._id.toString(),
      event._id.toHexString(),
      moveInput(destination._id.toHexString()) as never,
    );

    const notifiedCalendarIds = publishSpy.mock.calls.map(
      ([, payload]) => payload.calendarId,
    );
    expect(notifiedCalendarIds).toEqual(
      expect.arrayContaining([
        source._id.toHexString(),
        destination._id.toHexString(),
      ]),
    );
  });

  it("moves the Google copy via events.move (then patches) when both calendars are Google", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const source = await seedGoogleCalendar(user._id, { access: "owner" });
    const destination = await seedGoogleCalendar(user._id, {
      access: "writer",
      isPrimary: false,
    });
    const event = buildEventRecord(source._id, {
      externalReference: {
        provider: "google",
        eventId: "google-event-1",
        recurringEventId: null,
      },
    });
    await mongoService.event.insertOne(event);

    const moveSpy = jest
      .spyOn(gcalService, "moveEvent")
      .mockResolvedValue({} as never);
    const patchSpy = jest
      .spyOn(gcalService, "patchEvent")
      .mockResolvedValue({} as never);

    await eventService.replace(
      user._id.toString(),
      event._id.toHexString(),
      moveInput(destination._id.toHexString()) as never,
    );

    expect(moveSpy).toHaveBeenCalledWith(
      expect.anything(),
      source.source.calendarId,
      "google-event-1",
      destination.source.calendarId,
    );
    expect(patchSpy).toHaveBeenCalledWith(
      expect.anything(),
      destination.source.calendarId,
      "google-event-1",
      expect.anything(),
    );

    const stored = await mongoService.event.findOne({ _id: event._id });
    expect(stored?.externalReference).toEqual(
      expect.objectContaining({ eventId: "google-event-1" }),
    );
  });
});
