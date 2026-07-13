import { Origin, Priorities } from "@core/constants/core.constants";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { describe, expect, it, mock } from "bun:test";

const createMockGridPosition = (): Schema_GridEvent["position"] => ({
  isOverlapping: false,
  totalEventsInGroup: 1,
  widthMultiplier: 1,
  horizontalOrder: 1,
  dragOffset: { x: 0, y: 0 },
  initialX: null,
  initialY: null,
});

const createMockGridEvent = (
  overrides: Partial<Schema_GridEvent> = {},
): Schema_GridEvent => ({
  _id: "test-grid-event-id",
  title: "Test Grid Event",
  startDate: "2024-01-15T10:00:00Z",
  endDate: "2024-01-15T11:00:00Z",
  isAllDay: false,
  origin: Origin.COMPASS,
  priority: Priorities.UNASSIGNED,
  user: "test-user",
  position: createMockGridPosition(),
  ...overrides,
});

const validateGridEvent = mock(
  (event: Schema_GridEvent): Schema_GridEvent => event,
);
mock.module("@web/common/validators/grid.event.validator", () => ({
  validateGridEvent,
}));

const { OnSubmitParser, prepEventBeforeSubmit } =
  require("./submit.parser") as typeof import("./submit.parser");

describe("submit.parser", () => {
  describe("OnSubmitParser", () => {
    describe("constructor", () => {
      it("should initialize with a grid event", () => {
        const event = createMockGridEvent();
        const parser = new OnSubmitParser(event);

        expect(parser).toHaveProperty("event", event);
      });
    });

    describe("parse", () => {
      it("should parse a grid event correctly", () => {
        const event = createMockGridEvent();
        const parser = new OnSubmitParser(event);

        const result = parser.parse();

        expect(result).toBeDefined();
        expect(result._id).toBe(event._id);
        expect(result.user).toBe(event.user);
        expect(result.origin).toBe(Origin.COMPASS);
      });
    });
  });

  describe("prepEventBeforeSubmit", () => {
    it("should prepare a grid event with all required fields", () => {
      const draft = createMockGridEvent({
        origin: Origin.GOOGLE,
        priority: Priorities.SELF,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId) as Schema_GridEvent;

      expect(result._id).toBe(draft._id);
      expect(result.user).toBe(userId);
      expect(result.origin).toBe(Origin.GOOGLE);
      expect(result.priority).toBe(Priorities.SELF);
    });

    it("should use COMPASS origin when origin is not provided", () => {
      const draft = createMockGridEvent({
        origin: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result.origin).toBe(Origin.COMPASS);
    });

    it("should include recurrence when present", () => {
      const recurrence = {
        rule: ["FREQ=DAILY;COUNT=7"],
        endDate: "2024-01-22T10:00:00Z",
      };
      const draft = createMockGridEvent({
        recurrence,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toEqual(recurrence);
    });

    it("should not include recurrence when not present", () => {
      const draft = createMockGridEvent({
        recurrence: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toBeUndefined();
    });

    it("should handle null recurrence", () => {
      const draft = createMockGridEvent({
        recurrence: { rule: null },
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toEqual({ rule: null });
    });

    it("should assemble grid event when position is missing", () => {
      const draft = createMockGridEvent({
        position: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result).toEqual(
        expect.objectContaining({
          _id: draft._id,
          startDate: draft.startDate,
          endDate: draft.endDate,
          origin: draft.origin,
          user: userId,
          position: expect.objectContaining({
            isOverlapping: false,
            widthMultiplier: 1,
          }),
        }),
      );
    });

    it("should not assemble grid event when position is present", () => {
      const position = {
        isOverlapping: true,
        totalEventsInGroup: 2,
        widthMultiplier: 0.5,
        horizontalOrder: 2,
        dragOffset: { x: 0, y: 10 },
        initialX: 100,
        initialY: 200,
      };
      const draft = createMockGridEvent({ position });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId) as unknown as {
        position: Schema_GridEvent["position"];
      };

      expect(result.position).toEqual(position);
    });

    it("should handle all-day events without position", () => {
      const draft = createMockGridEvent({
        isAllDay: true,
        position: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(result).toEqual(
        expect.objectContaining({
          isAllDay: true,
          user: userId,
          position: expect.objectContaining({
            isOverlapping: false,
            widthMultiplier: 1,
          }),
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle grid event with missing _id", () => {
      const draft = createMockGridEvent({
        _id: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = prepEventBeforeSubmit(draft, userId);
      expect(result._id).toBeUndefined();
    });

    it("should reject grid event with missing startDate", () => {
      const draft = createMockGridEvent({
        startDate: undefined,
      });
      const userId = "test-user-id";

      expect(() => prepEventBeforeSubmit(draft, userId)).toThrow(
        "Event requires startDate and endDate",
      );
    });

    it("should reject grid event with missing endDate", () => {
      const draft = createMockGridEvent({
        endDate: undefined,
      });
      const userId = "test-user-id";

      expect(() => prepEventBeforeSubmit(draft, userId)).toThrow(
        "Event requires startDate and endDate",
      );
    });

    it("should handle grid event with missing user", () => {
      const draft = createMockGridEvent({
        user: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = prepEventBeforeSubmit(draft, userId);
      expect(result.user).toBe(userId); // The function sets user to the provided userId
    });
  });
});
