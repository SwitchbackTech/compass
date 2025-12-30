import { RootState } from "@web/store";
import {
  selectIsEventPending,
  selectPendingEventIds,
} from "./pending.selectors";

describe("pending selectors", () => {
  const createMockState = (pendingIds: string[]): RootState => {
    return {
      events: {
        pendingEvents: {
          eventIds: pendingIds,
        },
      },
    } as RootState;
  };

  describe("selectPendingEventIds", () => {
    it("should return empty array when no pending events", () => {
      const state = createMockState([]);
      const result = selectPendingEventIds(state);

      expect(result).toEqual([]);
    });

    it("should return array of pending event IDs", () => {
      const pendingIds = ["event-1", "event-2", "event-3"];
      const state = createMockState(pendingIds);
      const result = selectPendingEventIds(state);

      expect(result).toEqual(pendingIds);
      expect(result).toHaveLength(3);
    });
  });

  describe("selectIsEventPending", () => {
    it("should return false when event is not pending", () => {
      const state = createMockState(["event-1", "event-2"]);
      const result = selectIsEventPending(state, "event-3");

      expect(result).toBe(false);
    });

    it("should return true when event is pending", () => {
      const state = createMockState(["event-1", "event-2", "event-3"]);
      const result = selectIsEventPending(state, "event-2");

      expect(result).toBe(true);
    });

    it("should return false for empty pending list", () => {
      const state = createMockState([]);
      const result = selectIsEventPending(state, "event-1");

      expect(result).toBe(false);
    });

    it("should handle multiple calls with different event IDs", () => {
      const state = createMockState(["event-1", "event-2"]);

      expect(selectIsEventPending(state, "event-1")).toBe(true);
      expect(selectIsEventPending(state, "event-2")).toBe(true);
      expect(selectIsEventPending(state, "event-3")).toBe(false);
    });
  });
});
