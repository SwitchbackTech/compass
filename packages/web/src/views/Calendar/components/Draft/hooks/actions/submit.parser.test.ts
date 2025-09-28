import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_GridEvent,
  Schema_SomedayEvent,
} from "@web/common/types/web.event.types";
import {
  OnSubmitParser,
  parseSomedayEventBeforeSubmit,
  prepEventBeforeSubmit,
} from "./submit.parser";

// Mock the validators
jest.mock("@web/common/validators/grid.event.validator", () => ({
  validateGridEvent: jest.fn((event) => event as Schema_GridEvent),
}));

jest.mock("@web/common/validators/someday.event.validator", () => ({
  validateSomedayEvent: jest.fn((event) => event as Schema_SomedayEvent),
}));

// Mock the event utility
jest.mock("@web/common/utils/event/event.util", () => ({
  assembleGridEvent: jest.fn((event) => ({
    ...event,
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
      dragOffset: { y: 0 },
      initialX: null,
      initialY: null,
    },
  })),
}));

describe("submit.parser", () => {
  const createMockGridEvent = (
    overrides: Partial<Schema_GridEvent> = {},
  ): Schema_GridEvent => ({
    _id: "test-grid-event-id",
    title: "Test Grid Event",
    startDate: "2024-01-15T10:00:00Z",
    endDate: "2024-01-15T11:00:00Z",
    isAllDay: false,
    isSomeday: false,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: "test-user",
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
      dragOffset: { y: 0 },
      initialX: null,
      initialY: null,
    },
    ...overrides,
  });

  const createMockSomedayEvent = (
    overrides: Partial<Schema_SomedayEvent> = {},
  ): Schema_SomedayEvent => ({
    _id: "test-someday-event-id",
    title: "Test Someday Event",
    startDate: "2024-01-15T10:00:00Z",
    endDate: "2024-01-15T11:00:00Z",
    isAllDay: false,
    isSomeday: true,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    user: "test-user",
    order: 1,
    ...overrides,
  });

  describe("OnSubmitParser", () => {
    describe("constructor", () => {
      it("should initialize with a grid event", () => {
        const event = createMockGridEvent();
        const parser = new OnSubmitParser(event);

        expect(parser["event"]).toBe(event);
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

      it("should parse a someday event correctly", () => {
        const event = createMockSomedayEvent();
        const parser = new OnSubmitParser(event as any);

        const result = parser.parse();

        expect(result).toBeDefined();
        expect(result._id).toBe(event._id);
        expect(result.user).toBe(event.user);
        expect(result.origin).toBe(Origin.COMPASS);
      });
    });
  });

  describe("parseSomedayEventBeforeSubmit", () => {
    it("should parse a someday event with all required fields", () => {
      const draft = createMockSomedayEvent({
        _id: "test-id",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
        priority: Priorities.WORK,
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      expect(result._id).toBe("test-id");
      expect(result.startDate).toBe("2024-01-15T10:00:00Z");
      expect(result.endDate).toBe("2024-01-15T11:00:00Z");
      expect(result.origin).toBe(Origin.COMPASS);
      expect(result.user).toBe(userId);
      expect(result.priority).toBe(Priorities.WORK);
    });

    it("should use UNASSIGNED priority when priority is not provided", () => {
      const draft = createMockSomedayEvent({
        priority: undefined,
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      expect(result.priority).toBe(Priorities.UNASSIGNED);
    });

    it("should include recurrence when present", () => {
      const recurrence = {
        rule: ["FREQ=WEEKLY;COUNT=4"],
        endDate: "2024-02-15T10:00:00Z",
      };
      const draft = createMockSomedayEvent({
        recurrence,
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toEqual(recurrence);
    });

    it("should not include recurrence when not present", () => {
      const draft = createMockSomedayEvent({
        recurrence: undefined,
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toBeUndefined();
    });

    it("should handle null recurrence", () => {
      const draft = createMockSomedayEvent({
        recurrence: { rule: null },
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      expect(result.recurrence).toEqual({ rule: null });
    });
  });

  describe("prepEventBeforeSubmit", () => {
    it("should prepare a grid event with all required fields", () => {
      const draft = createMockGridEvent({
        origin: Origin.GOOGLE,
        priority: Priorities.SELF,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

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
      const {
        assembleGridEvent,
      } = require("@web/common/utils/event/event.util");
      assembleGridEvent.mockClear();

      const draft = createMockGridEvent({
        position: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(assembleGridEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: draft._id,
          startDate: draft.startDate,
          endDate: draft.endDate,
          origin: draft.origin,
          user: userId,
          position: undefined,
        }),
      );
    });

    it("should not assemble grid event when position is present", () => {
      const {
        assembleGridEvent,
      } = require("@web/common/utils/event/event.util");
      assembleGridEvent.mockClear();

      const draft = createMockGridEvent({
        position: {
          isOverlapping: true,
          widthMultiplier: 0.5,
          horizontalOrder: 2,
          dragOffset: { y: 10 },
          initialX: 100,
          initialY: 200,
        },
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(assembleGridEvent).not.toHaveBeenCalled();
    });

    it("should handle all-day events without position", () => {
      const {
        assembleGridEvent,
      } = require("@web/common/utils/event/event.util");
      assembleGridEvent.mockClear();

      const draft = createMockGridEvent({
        isAllDay: true,
        position: undefined,
      });
      const userId = "test-user-id";

      const result = prepEventBeforeSubmit(draft, userId);

      expect(assembleGridEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          isAllDay: true,
          position: undefined,
          user: userId,
        }),
      );
    });
  });

  describe("edge cases", () => {
    it("should handle someday event with missing _id", () => {
      const draft = createMockSomedayEvent({
        _id: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = parseSomedayEventBeforeSubmit(draft, userId);
      expect(result._id).toBeUndefined();
    });

    it("should handle someday event with missing startDate", () => {
      const draft = createMockSomedayEvent({
        startDate: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = parseSomedayEventBeforeSubmit(draft, userId);
      expect(result.startDate).toBeUndefined();
    });

    it("should handle someday event with missing endDate", () => {
      const draft = createMockSomedayEvent({
        endDate: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = parseSomedayEventBeforeSubmit(draft, userId);
      expect(result.endDate).toBeUndefined();
    });

    it("should handle someday event with missing order field", () => {
      const draft = createMockSomedayEvent({
        order: undefined,
      });
      const userId = "test-user-id";

      const result = parseSomedayEventBeforeSubmit(draft, userId);

      // Should provide a default order of 0 when order is missing
      expect(result.order).toBe(0);
    });

    it("should handle grid event with missing _id", () => {
      const draft = createMockGridEvent({
        _id: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = prepEventBeforeSubmit(draft, userId);
      expect(result._id).toBeUndefined();
    });

    it("should handle grid event with missing startDate", () => {
      const draft = createMockGridEvent({
        startDate: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = prepEventBeforeSubmit(draft, userId);
      expect(result.startDate).toBeUndefined();
    });

    it("should handle grid event with missing endDate", () => {
      const draft = createMockGridEvent({
        endDate: undefined,
      });
      const userId = "test-user-id";

      // The function uses non-null assertion, so it will pass undefined
      const result = prepEventBeforeSubmit(draft, userId);
      expect(result.endDate).toBeUndefined();
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
