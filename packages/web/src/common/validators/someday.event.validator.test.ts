import { ObjectId } from "bson";
import { z } from "zod";
import { Origin, Priorities } from "@core/constants/core.constants";
import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { Schema_WebEvent } from "../schemas/events/web.event.schemas";
import {
  validateSomedayEvent,
  validateSomedayEvents,
} from "./someday.event.validator";

describe("someday.event.validator", () => {
  const validObjectId = new ObjectId().toString();
  const validOptimisticId = `${ID_OPTIMISTIC_PREFIX}-${new ObjectId().toString()}`;

  const createValidWebEvent = (
    overrides: Partial<Schema_WebEvent & { order?: number }> = {},
  ): Schema_WebEvent & { order?: number } => ({
    _id: validObjectId,
    description: "Test event description",
    endDate: "2024-01-02T10:00:00.000Z",
    isAllDay: false,
    isSomeday: true,
    gEventId: "gcal-event-id",
    gRecurringEventId: "gcal-recurring-id",
    origin: Origin.COMPASS,
    priority: Priorities.WORK,
    startDate: "2024-01-01T09:00:00.000Z",
    title: "Test Event",
    updatedAt: new Date("2024-01-01T08:00:00.000Z"),
    user: "user-id",
    ...overrides,
  });

  describe("validateSomedayEvent", () => {
    it("should validate a valid someday event with ObjectId", () => {
      const validEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: 1,
      });

      const result = validateSomedayEvent(validEvent);

      expect(result).toEqual(validEvent);
      expect(result._id).toBe(validObjectId);
      expect(result.isSomeday).toBe(true);
      expect(result.order).toBe(1);
    });

    it("should validate a valid someday event with optimistic ID", () => {
      const validEvent = createValidWebEvent({
        _id: validOptimisticId,
        isSomeday: true,
        order: 2,
      });

      const result = validateSomedayEvent(validEvent);

      expect(result).toEqual(validEvent);
      expect(result._id).toBe(validOptimisticId);
      expect(result.isSomeday).toBe(true);
      expect(result.order).toBe(2);
    });

    it("should validate a someday event with minimal required fields", () => {
      const minimalEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: 0,
        description: undefined,
        gEventId: undefined,
        gRecurringEventId: undefined,
        isAllDay: undefined,
        updatedAt: undefined,
      });

      const result = validateSomedayEvent(minimalEvent);

      expect(result).toEqual(minimalEvent);
      expect(result.isSomeday).toBe(true);
      expect(result.order).toBe(0);
    });

    it("should throw ZodError for invalid _id format", () => {
      const invalidEvent = createValidWebEvent({
        _id: "invalid-id",
        isSomeday: true,
        order: 1,
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for missing isSomeday field", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        order: 1,
      });
      delete (invalidEvent as any).isSomeday;

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for isSomeday not being true", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: false,
        order: 1,
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for missing order field", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
      });
      delete (invalidEvent as any).order;

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for invalid order type", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: "not-a-number" as any,
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for invalid origin enum", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: 1,
        origin: "invalid-origin" as any,
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for invalid priority enum", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: 1,
        priority: "invalid-priority" as any,
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for invalid date format", () => {
      const invalidEvent = createValidWebEvent({
        _id: validObjectId,
        isSomeday: true,
        order: 1,
        startDate: "invalid-date",
      });

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });

    it("should throw ZodError for missing required fields", () => {
      const invalidEvent = {
        _id: validObjectId,
        isSomeday: true,
        order: 1,
        // Missing required fields like origin, priority, startDate, endDate, user
      } as any;

      expect(() => validateSomedayEvent(invalidEvent)).toThrow(z.ZodError);
    });
  });

  describe("validateSomedayEvents", () => {
    it("should validate an array of valid someday events", () => {
      const validEvents = [
        createValidWebEvent({
          _id: validObjectId,
          isSomeday: true,
          order: 1,
          title: "Event 1",
        }),
        createValidWebEvent({
          _id: validOptimisticId,
          isSomeday: true,
          order: 2,
          title: "Event 2",
        }),
      ];

      const results = validateSomedayEvents(validEvents);

      expect(results).toHaveLength(2);
      expect(results[0].title).toBe("Event 1");
      expect(results[1].title).toBe("Event 2");
      expect(results[0].isSomeday).toBe(true);
      expect(results[1].isSomeday).toBe(true);
    });

    it("should validate an empty array", () => {
      const results = validateSomedayEvents([]);

      expect(results).toEqual([]);
    });

    it("should throw ZodError if any event in the array is invalid", () => {
      const mixedEvents = [
        createValidWebEvent({
          _id: validObjectId,
          isSomeday: true,
          order: 1,
          title: "Valid Event",
        }),
        createValidWebEvent({
          _id: "invalid-id",
          isSomeday: true,
          order: 2,
          title: "Invalid Event",
        }),
      ];

      expect(() => validateSomedayEvents(mixedEvents)).toThrow(z.ZodError);
    });

    it("should process all events individually", () => {
      const events = [
        createValidWebEvent({
          _id: validObjectId,
          isSomeday: true,
          order: 1,
          title: "Event 1",
        }),
        createValidWebEvent({
          _id: validOptimisticId,
          isSomeday: true,
          order: 2,
          title: "Event 2",
        }),
        createValidWebEvent({
          _id: new ObjectId().toString(),
          isSomeday: true,
          order: 3,
          title: "Event 3",
        }),
      ];

      const results = validateSomedayEvents(events);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.title).toBe(`Event ${index + 1}`);
        expect(result.isSomeday).toBe(true);
        expect(result.order).toBe(index + 1);
      });
    });
  });
});
