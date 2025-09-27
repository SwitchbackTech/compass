import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { Schema_WebEvent } from "../types/web.event.types";
import { EventInViewParser } from "./view.parser";

// Extend dayjs with isBetween plugin
dayjs.extend(isBetween);

describe("EventInViewParser", () => {
  const createMockEvent = (
    overrides: Partial<Schema_WebEvent> = {},
  ): Schema_WebEvent => ({
    _id: "test-event-id",
    title: "Test Event",
    startDate: "2024-01-15T10:00:00Z",
    endDate: "2024-01-15T11:00:00Z",
    isAllDay: false,
    origin: "COMPASS" as any,
    priority: "MEDIUM" as any,
    user: "test-user",
    ...overrides,
  });

  const createViewRange = (startDate: string, endDate: string) => ({
    startOfView: dayjs(startDate),
    endOfView: dayjs(endDate),
  });

  describe("isEventInView", () => {
    it("should return true when event start is in view", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should return true when event end is in view", () => {
      const event = createMockEvent({
        startDate: "2024-01-14T10:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should return true when event spans the view", () => {
      const event = createMockEvent({
        startDate: "2024-01-14T10:00:00Z",
        endDate: "2024-01-16T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should return false when event is completely outside view", () => {
      const event = createMockEvent({
        startDate: "2024-01-13T10:00:00Z",
        endDate: "2024-01-14T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(false);
    });

    it("should return true when event starts exactly at view start", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T01:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should return true when event ends exactly at view end", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T22:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });
  });

  describe("isEventOutsideView", () => {
    it("should return true when event is completely outside view", () => {
      const event = createMockEvent({
        startDate: "2024-01-13T10:00:00Z",
        endDate: "2024-01-14T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventOutsideView()).toBe(true);
    });

    it("should return false when event start is in view", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventOutsideView()).toBe(false);
    });

    it("should return false when event end is in view", () => {
      const event = createMockEvent({
        startDate: "2024-01-14T10:00:00Z",
        endDate: "2024-01-15T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventOutsideView()).toBe(false);
    });

    it("should return false when event spans the view", () => {
      const event = createMockEvent({
        startDate: "2024-01-14T10:00:00Z",
        endDate: "2024-01-16T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventOutsideView()).toBe(false);
    });
  });

  describe("shouldAddToViewAfterDragToEdge", () => {
    it("should return true when dragging to edge, event was moved, and not already visible", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("drag-to-edge", []);

      expect(result).toBe(true);
    });

    it("should return false when not dragging to edge", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("manual", []);

      expect(result).toBe(false);
    });

    it("should return false when event was not moved", () => {
      const event = createMockEvent({
        startDate: "2024-01-13T10:00:00Z",
        endDate: "2024-01-14T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("drag-to-edge", []);

      expect(result).toBe(false);
    });

    it("should return false when event is already visible", () => {
      const event = createMockEvent({
        _id: "test-event-id",
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("drag-to-edge", [
        "test-event-id",
      ]);

      expect(result).toBe(false);
    });

    it("should return false when all conditions are not met", () => {
      const event = createMockEvent({
        startDate: "2024-01-13T10:00:00Z",
        endDate: "2024-01-14T10:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("manual", [
        "test-event-id",
      ]);

      expect(result).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle all-day events correctly", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T00:00:00Z",
        endDate: "2024-01-15T23:59:59Z",
        isAllDay: true,
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should handle events with different timezones", () => {
      const event = createMockEvent({
        startDate: "2024-01-15T10:00:00-05:00",
        endDate: "2024-01-15T11:00:00-05:00",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
    });

    it("should handle events spanning multiple days", () => {
      const event = createMockEvent({
        startDate: "2024-01-14T22:00:00Z",
        endDate: "2024-01-16T02:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );

      const parser = new EventInViewParser(event, startOfView, endOfView);

      expect(parser.isEventInView()).toBe(true);
      expect(parser["isSpanningView"]).toBe(true);
    });

    it("should handle events with missing _id", () => {
      const event = createMockEvent({
        _id: undefined,
        startDate: "2024-01-15T10:00:00Z",
        endDate: "2024-01-15T11:00:00Z",
      });
      const { startOfView, endOfView } = createViewRange(
        "2024-01-15T00:00:00Z",
        "2024-01-15T23:59:59Z",
      );
      const parser = new EventInViewParser(event, startOfView, endOfView);

      const result = parser.shouldAddToViewAfterDragToEdge("drag-to-edge", []);

      // When _id is undefined, idsInView.includes(undefined) returns false,
      // so the event is considered not already visible and should be added
      expect(result).toBe(true);
    });
  });
});
