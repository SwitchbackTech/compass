import { ObjectId } from "mongodb";
import { UtilDriver } from "@backend/__tests__/drivers/util.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { CalendarRecordSchema } from "@backend/calendar/calendar.record";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";

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
      priority: "unassigned",
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
      priority: "unassigned" as const,
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
      priority: "unassigned",
    });

    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .toArray();

    expect(instances).toHaveLength(2);
  });

  it("reorders someday events for the owning user only", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Read a book", description: "" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
      priority: "unassigned",
    });

    await eventService.reorder(user._id.toString(), {
      period: "week",
      items: [{ eventId: created._id.toHexString() as never, sortOrder: 3 }],
    });

    const updated = await eventService.readById(
      user._id.toString(),
      created._id.toHexString(),
    );
    expect(
      updated.schedule.kind === "someday" ? updated.schedule.sortOrder : null,
    ).toBe(3);
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
      priority: "unassigned",
    });

    await eventService.delete(user._id.toString(), created._id.toHexString(), {
      scope: "this",
    });

    await expect(
      eventService.readById(user._id.toString(), created._id.toHexString()),
    ).rejects.toMatchObject({ mutationCode: "EVENT_NOT_FOUND" });
  });

  it("transitions a someday event onto a calendar (schedule)", async () => {
    const { user } = await UtilDriver.setupTestUser();
    const calendar = await seedLocalCalendar(user._id);

    const created = await eventService.create(user._id.toString(), {
      calendarId: calendar._id.toHexString() as never,
      content: { kind: "details", title: "Plan trip", description: "" },
      schedule: {
        kind: "someday",
        period: "week",
        anchorDate: "2026-07-13",
        sortOrder: 0,
      },
      recurrence: { kind: "single" },
      priority: "unassigned",
    });

    const transitioned = await eventService.transition(
      user._id.toString(),
      created._id.toHexString(),
      {
        kind: "schedule",
        targetCalendarId: calendar._id.toHexString() as never,
        schedule: {
          kind: "timed",
          start: "2026-07-14T15:00:00-06:00",
          end: "2026-07-14T16:00:00-06:00",
          timeZone: "America/Denver",
        },
      },
    );

    expect(transitioned.schedule.kind).toBe("timed");
    expect(transitioned.calendarId).toEqual(calendar._id);
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
      priority: "unassigned",
    });

    const results = await eventService.readAll(user._id.toString(), {
      kind: "range",
      start: "2026-07-14T00:00:00Z",
      end: "2026-07-15T00:00:00Z",
      priorities: [],
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
      priority: "unassigned",
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
      priority: "unassigned",
    });

    const before = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .toArray();
    expect(before).toHaveLength(2);

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
      priority: "unassigned",
    });

    const instances = await mongoService.event
      .find({ "recurrence.seriesId": created._id })
      .sort({ "schedule.start": 1 })
      .toArray();
    expect(instances).toHaveLength(2);
    const [earlier, later] = instances;

    await eventService.delete(user._id.toString(), later!._id.toHexString(), {
      scope: "thisAndFollowing",
    });

    const remainingInstanceIds = (
      await mongoService.event
        .find({ "recurrence.seriesId": created._id })
        .toArray()
    ).map((e) => e._id.toHexString());

    expect(remainingInstanceIds).toEqual([earlier!._id.toHexString()]);
    expect(
      await eventService.readById(
        user._id.toString(),
        created._id.toHexString(),
      ),
    ).toBeTruthy();
  });
});
