import { ObjectId } from "mongodb";
import {
  CalendarProvider,
  CompassCoreEventSchema,
  type Query_Event,
} from "@core/types/event.types";
import { CompassEventRRule } from "@core/util/event/compass.event.rrule";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import {
  _createCompassEvent,
  _deleteSeries,
  default as eventService,
} from "@backend/event/services/event.service";

// Use real services, no mocks

describe("Compass Event Service", () => {
  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("_createCompassEvent", () => {
    it("preserves someday event order after request validation", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = createMockStandaloneEvent({
        isSomeday: true,
        order: 3,
        user: userId,
      });
      const parsedEvent = CompassCoreEventSchema.parse(baseEvent);
      const _id = new ObjectId(parsedEvent._id);

      const result = await _createCompassEvent(
        { ...parsedEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
      );

      expect(result.order).toBe(3);
    });

    it("creates a compass standalone event if it does not exist", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = createMockStandaloneEvent({ user: userId });
      const _id = new ObjectId(baseEvent._id);

      const result = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );
    });

    it("creates a compass base event and its instances if it does not exist", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        user: userId,
      });

      const _id = new ObjectId(baseEvent._id);

      const result = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
        new CompassEventRRule({ ...baseEvent, _id }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const instances = await mongoService.event
        .find({ "recurrence.eventId": baseEvent._id, user: userId })
        .toArray();

      expect(instances).toHaveLength(5);
    });

    it("replaces a compass event if it exists", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = createMockStandaloneEvent({ user: userId });
      const _id = new ObjectId(baseEvent._id);

      const event = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
      );

      expect(event).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const result = await _createCompassEvent(
        {
          ...event,
          _id: new ObjectId(event._id),
          user: event.user!,
          title: "Updated Title",
        },
        CalendarProvider.GOOGLE,
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          title: "Updated Title",
          origin: CalendarProvider.COMPASS,
        }),
      );
    });

    it("removes the provider data of an existing compass base event if isSomeday is true", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const baseEvent = createMockStandaloneEvent({ user: userId });
      const _id = new ObjectId(baseEvent._id);

      const event = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
      );

      expect(event).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const result = await _createCompassEvent(
        {
          ...baseEvent,
          _id: new ObjectId(event._id),
          user: event.user!,
          isSomeday: true,
        },
        CalendarProvider.GOOGLE,
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      expect(result.gEventId).toBeUndefined();
    });
  });

  describe("readAll someday order", () => {
    const somedayQuery: Query_Event = {
      end: "2026-05-31",
      someday: "true",
      start: "2026-05-01",
    };

    const createSomedayEvent = (
      userId: string,
      title: string,
      order?: number,
      _id = new ObjectId().toString(),
    ) => ({
      ...createMockStandaloneEvent({
        _id,
        isSomeday: true,
        order,
        startDate: "2026-05-10",
        title,
        user: userId,
      }),
      _id: new ObjectId(_id),
    });

    it("returns someday events by saved order", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      await mongoService.event.insertMany([
        createSomedayEvent(userId, "Alpha", 1),
        createSomedayEvent(userId, "Bravo", 2),
        createSomedayEvent(userId, "Zebra", 0),
      ]);

      const result = await eventService.readAll(userId, somedayQuery);

      expect(Array.isArray(result)).toBe(true);
      expect(
        (result as Array<{ title?: string }>).map((event) => event.title),
      ).toEqual(["Zebra", "Alpha", "Bravo"]);
    });

    it("repairs missing someday event order values on read", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();
      const missingFirstId = "507f1f77bcf86cd799439012";
      const missingSecondId = "507f1f77bcf86cd799439014";

      await mongoService.event.insertMany([
        createSomedayEvent(
          userId,
          "Existing zero",
          0,
          "507f1f77bcf86cd799439011",
        ),
        createSomedayEvent(userId, "Missing first", undefined, missingFirstId),
        createSomedayEvent(
          userId,
          "Existing two",
          2,
          "507f1f77bcf86cd799439013",
        ),
        createSomedayEvent(
          userId,
          "Missing second",
          undefined,
          missingSecondId,
        ),
      ]);

      const result = await eventService.readAll(userId, somedayQuery);

      expect(Array.isArray(result)).toBe(true);
      expect(
        (result as Array<{ title?: string }>).map((event) => event.title),
      ).toEqual([
        "Existing zero",
        "Missing first",
        "Existing two",
        "Missing second",
      ]);

      const repairedEvents = await mongoService.event
        .find({
          _id: {
            $in: [new ObjectId(missingFirstId), new ObjectId(missingSecondId)],
          },
          user: userId,
        })
        .sort({ _id: 1 })
        .toArray();

      expect(repairedEvents.map((event) => event.order)).toEqual([1, 3]);
    });
  });

  describe("_deleteSeries", () => {
    it("throws if userId is not valid", async () => {
      await expect(
        _deleteSeries("", new ObjectId().toString()),
      ).rejects.toThrow("Invalid id");
    });

    it("throws if baseId is not valid", async () => {
      await expect(
        _deleteSeries(new ObjectId().toString(), ""),
      ).rejects.toThrow("Invalid id");
    });

    it("deletes an entire series of events", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        user: userId,
      });

      const _id = new ObjectId(baseEvent._id);

      const result = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
        new CompassEventRRule({ ...baseEvent, _id }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const instances = await mongoService.event
        .find({ "recurrence.eventId": baseEvent._id, user: userId })
        .toArray();

      expect(instances).toHaveLength(5);

      await _deleteSeries(userId, baseEvent._id);

      const series = await mongoService.event
        .find({
          $or: [
            { _id, user: userId },
            { "recurrence.eventId": baseEvent._id, user: userId },
          ],
        })
        .toArray();

      expect(series).toHaveLength(0);
    });

    it("deletes an entire series of events excluding the base event", async () => {
      const user = await UserDriver.createUser();
      const userId = user._id.toString();

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        user: userId,
      });

      const _id = new ObjectId(baseEvent._id);

      const result = await _createCompassEvent(
        { ...baseEvent, _id, user: userId },
        CalendarProvider.GOOGLE,
        new CompassEventRRule({ ...baseEvent, _id }),
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          user: userId,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const instances = await mongoService.event
        .find({ "recurrence.eventId": baseEvent._id, user: userId })
        .toArray();

      expect(instances).toHaveLength(5);

      await _deleteSeries(userId, baseEvent._id, undefined, true);

      const series = await mongoService.event
        .find({
          $or: [
            { _id, user: userId },
            { "recurrence.eventId": baseEvent._id, user: userId },
          ],
        })
        .toArray();

      expect(series).toHaveLength(1);
      expect(series[0]!._id).toEqual(_id);
    });
  });
});
