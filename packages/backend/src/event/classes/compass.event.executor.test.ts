import { ObjectId } from "mongodb";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  executeDelete,
  executeMutation,
} from "@backend/event/classes/compass.event.executor";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";

const calendarId = new ObjectId();

const buildEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  _id: new ObjectId(),
  calendarId,
  content: { kind: "details", title: "Standup", description: "" },
  schedule: {
    kind: "timed",
    start: new Date("2026-07-14T15:00:00.000Z"),
    end: new Date("2026-07-14T16:00:00.000Z"),
    timeZone: "America/Denver",
  },
  recurrence: { kind: "single" },
  priority: "unassigned",
  externalReference: null,
  createdAt: new Date(),
  updatedAt: null,
  ...overrides,
});

describe("executeMutation", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("upserts every record in the plan and returns the primary", async () => {
    const primary = buildEvent();
    const instance = buildEvent({
      recurrence: { kind: "occurrence", seriesId: primary._id },
    });

    const result = await executeMutation({
      upsert: [primary, instance],
      deleteIds: [],
      primary,
    });

    expect(result).toBe(primary);
    const stored = await mongoService.event
      .find({ _id: { $in: [primary._id, instance._id] } })
      .toArray();
    expect(stored).toHaveLength(2);
  });

  it("deletes deleteIds before upserting the plan's records", async () => {
    const stale = buildEvent();
    await eventRepository.insertOne(stale);
    const replacement = buildEvent();

    await executeMutation({
      upsert: [replacement],
      deleteIds: [stale._id],
      primary: replacement,
    });

    expect(await mongoService.event.findOne({ _id: stale._id })).toBeNull();
    expect(
      await mongoService.event.findOne({ _id: replacement._id }),
    ).toBeTruthy();
  });

  it("rolls back every write when the passed session's transaction aborts", async () => {
    const record = buildEvent();
    const session = await mongoService.startSession();

    try {
      await session.withTransaction(async (session) => {
        await executeMutation(
          { upsert: [record], deleteIds: [], primary: record },
          session,
        );
        throw new Error("force rollback");
      });
    } catch {
      // expected: withTransaction rethrows after aborting
    } finally {
      await session.endSession();
    }

    expect(await mongoService.event.findOne({ _id: record._id })).toBeNull();
  });
});

describe("executeDelete", () => {
  beforeEach(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  it("removes the whole series when deleteSeriesId is set, ignoring upsert/deleteIds", async () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY"] },
    });
    const occurrence = buildEvent({
      recurrence: { kind: "occurrence", seriesId: base._id },
    });
    await eventRepository.insertMany([base, occurrence]);

    await executeDelete({
      deleteSeriesId: base._id,
      deleteIds: [],
      upsert: [],
    });

    expect(await mongoService.event.findOne({ _id: base._id })).toBeNull();
    expect(
      await mongoService.event.findOne({ _id: occurrence._id }),
    ).toBeNull();
  });

  it("deletes following instances and upserts the truncated base for a split", async () => {
    const base = buildEvent({
      recurrence: { kind: "series", rules: ["RRULE:FREQ=WEEKLY;COUNT=3"] },
    });
    const following = buildEvent({
      recurrence: { kind: "occurrence", seriesId: base._id },
    });
    await eventRepository.insertMany([base, following]);

    const truncatedBase: EventRecord = {
      ...base,
      recurrence: {
        kind: "series",
        rules: ["RRULE:FREQ=WEEKLY;UNTIL=20260714T150000Z"],
      },
    };

    await executeDelete({
      deleteSeriesId: null,
      deleteIds: [following._id],
      upsert: [truncatedBase],
    });

    expect(await mongoService.event.findOne({ _id: following._id })).toBeNull();
    const stored = await mongoService.event.findOne({ _id: base._id });
    expect(stored?.recurrence).toEqual(truncatedBase.recurrence);
  });
});
