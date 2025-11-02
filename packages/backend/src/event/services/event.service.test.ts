import { faker } from "@faker-js/faker/.";
import { CalendarProvider } from "@core/types/calendar.types";
import { Schema_Base_Event } from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstances,
  createMockRegularEvent,
} from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import mongoService from "@backend/common/services/mongo.service";
import eventService from "@backend/event/services/event.service";
import { baseEventExclusionFilterExpr } from "./event.service.util";

// Use real services, no mocks

describe("Event Service", () => {
  beforeAll(setupTestDb);
  beforeEach(cleanupCollections);
  afterAll(cleanupTestDb);

  describe("create", () => {
    it("creates a compass standalone event if it does not exist", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const event = createMockRegularEvent({ calendar: calendar._id });

      const result = await eventService.create(event);
      const dbEvent = await eventService.readById(calendar._id, event._id);

      expect(result).toEqual(expect.objectContaining(dbEvent));
    });

    it("creates a compass base event and its instances if it does not exist", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        calendar: calendar._id,
      });

      const result = await eventService.create(baseEvent);

      const dbEvent = await eventService.readById(calendar._id, baseEvent._id);

      expect(result).toEqual(expect.objectContaining(dbEvent));

      const instances = await mongoService.event
        .find({
          "recurrence.eventId": baseEvent._id,
          calendar: calendar._id,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(instances).toHaveLength(5);
    });

    it("replaces a compass event if it exists", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const event = createMockRegularEvent({ calendar: calendar._id });

      const create = await eventService.create(event);
      const created = await eventService.readById(calendar._id, event._id);

      expect(create).toEqual(expect.objectContaining(created));

      const replace = await eventService.create({
        ...create,
        title: "Updated Title",
      });

      const replaced = await eventService.readById(calendar._id, event._id);

      expect(replace).toEqual(expect.objectContaining(replaced));
    });

    it("removes the provider data of an existing regular event, if it is converted to a someday event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const event = createMockRegularEvent({ calendar: calendar._id });

      const create = await eventService.create(event);
      const created = await eventService.readById(calendar._id, event._id);

      expect(create).toEqual(expect.objectContaining(created));

      const update = await eventService.create({ ...event, isSomeday: true });
      const updated = await eventService.readById(calendar._id, event._id);

      expect(update).toEqual(expect.objectContaining(updated));

      expect(update).not.toHaveProperty("metadata");
    });

    it("removes the provider data of an existing compass series, if it is converted to a someday event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        calendar: calendar._id,
      });

      const create = await eventService.create(baseEvent);
      const created = await eventService.readById(calendar._id, baseEvent._id);

      expect(create).toEqual(expect.objectContaining(created));

      const instances = await mongoService.event
        .find({
          "recurrence.eventId": baseEvent._id,
          calendar: calendar._id,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(instances).toHaveLength(5);

      const update = await eventService.create({ ...created, isSomeday: true });
      const updated = await eventService.readById(calendar._id, update._id);

      expect(update).toEqual(expect.objectContaining(updated));

      expect(update).not.toHaveProperty("metadata");

      const updatedInstances = await mongoService.event
        .find({
          "recurrence.eventId": update._id,
          calendar: calendar._id,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(updatedInstances).toHaveLength(5);

      updatedInstances.forEach((instance) => {
        expect(instance).not.toHaveProperty("metadata");
      });
    });
  });

  describe("deleteSeries", () => {
    it("throws if event's calendar field is not a valid ObjectId", async () => {
      const event = createMockBaseEvent();

      Reflect.set(event, "calendar", faker.string.ulid());

      await expect(eventService.deleteSeries(event)).rejects.toThrow(
        "Invalid input",
      );
    });

    it("throws if event's id is not a valid ObjectId", async () => {
      const event = createMockBaseEvent();

      Reflect.set(event, "_id", faker.string.ulid());

      await expect(eventService.deleteSeries(event)).rejects.toThrow(
        "Invalid input",
      );
    });

    it("throws if event is not a base event", async () => {
      await expect(
        eventService.deleteSeries(
          createMockRegularEvent() as Schema_Base_Event,
        ),
      ).rejects.toThrow();

      await expect(
        eventService.deleteSeries(
          createMockInstances(createMockBaseEvent())[0] as Schema_Base_Event,
        ),
      ).rejects.toThrow();
    });

    it("deletes an entire series of events", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        calendar: calendar._id,
      });

      const result = await eventService.create(baseEvent);

      expect(result).toEqual(
        expect.objectContaining({
          ...baseEvent,
          origin: CalendarProvider.COMPASS,
        }),
      );

      const instances = await mongoService.event
        .find({
          "recurrence.eventId": baseEvent._id,
          calendar: calendar._id,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(instances).toHaveLength(5);

      await eventService.deleteSeries(baseEvent);

      const series = await mongoService.event
        .find({ "recurrence.eventId": baseEvent._id, calendar: calendar._id })
        .toArray();

      expect(series).toHaveLength(0);
    });

    it("deletes an entire series of events excluding the base event", async () => {
      const user = await AuthDriver.googleSignup();
      const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

      const baseEvent = createMockBaseEvent({
        recurrence: { rule: ["RRULE:FREQ=DAILY;COUNT=5"] },
        calendar: calendar._id,
      });

      const result = await eventService.create(baseEvent);

      expect(result).toEqual(
        expect.objectContaining({
          _id: baseEvent._id,
          calendar: calendar._id,
        }),
      );

      const instances = await mongoService.event
        .find({
          "recurrence.eventId": baseEvent._id,
          calendar: calendar._id,
          $expr: baseEventExclusionFilterExpr,
        })
        .toArray();

      expect(instances).toHaveLength(5);

      await eventService.deleteSeries(baseEvent, undefined, true);

      const series = await mongoService.event
        .find({
          "recurrence.eventId": baseEvent._id,
          calendar: baseEvent.calendar,
        })
        .toArray();

      expect(series).toHaveLength(1);
      expect(series[0]!._id).toEqual(baseEvent._id);
    });
  });
});
