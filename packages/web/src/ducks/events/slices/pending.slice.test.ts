import { pendingEventsSlice } from "./pending.slice";

describe("pendingEventsSlice", () => {
  const initialState = { eventIds: [] };

  describe("add", () => {
    it("should add event ID to pending list", () => {
      const eventId = "event-123";
      const action = pendingEventsSlice.actions.add(eventId);
      const state = pendingEventsSlice.reducer(initialState, action);

      expect(state.eventIds).toContain(eventId);
      expect(state.eventIds).toHaveLength(1);
    });

    it("should not add duplicate event IDs", () => {
      const eventId = "event-123";
      const action = pendingEventsSlice.actions.add(eventId);

      let state = pendingEventsSlice.reducer(initialState, action);
      state = pendingEventsSlice.reducer(state, action);

      expect(state.eventIds).toContain(eventId);
      expect(state.eventIds).toHaveLength(1);
    });

    it("should add multiple different event IDs", () => {
      const eventId1 = "event-123";
      const eventId2 = "event-456";

      let state = pendingEventsSlice.reducer(
        initialState,
        pendingEventsSlice.actions.add(eventId1),
      );
      state = pendingEventsSlice.reducer(
        state,
        pendingEventsSlice.actions.add(eventId2),
      );

      expect(state.eventIds).toContain(eventId1);
      expect(state.eventIds).toContain(eventId2);
      expect(state.eventIds).toHaveLength(2);
    });
  });

  describe("remove", () => {
    it("should remove event ID from pending list", () => {
      const eventId = "event-123";
      const addAction = pendingEventsSlice.actions.add(eventId);
      const removeAction = pendingEventsSlice.actions.remove(eventId);

      let state = pendingEventsSlice.reducer(initialState, addAction);
      state = pendingEventsSlice.reducer(state, removeAction);

      expect(state.eventIds).not.toContain(eventId);
      expect(state.eventIds).toHaveLength(0);
    });

    it("should not error when removing non-existent event ID", () => {
      const eventId = "event-123";
      const action = pendingEventsSlice.actions.remove(eventId);
      const state = pendingEventsSlice.reducer(initialState, action);

      expect(state.eventIds).not.toContain(eventId);
      expect(state.eventIds).toHaveLength(0);
    });

    it("should remove specific event ID without affecting others", () => {
      const eventId1 = "event-123";
      const eventId2 = "event-456";

      let state = pendingEventsSlice.reducer(
        initialState,
        pendingEventsSlice.actions.add(eventId1),
      );
      state = pendingEventsSlice.reducer(
        state,
        pendingEventsSlice.actions.add(eventId2),
      );
      state = pendingEventsSlice.reducer(
        state,
        pendingEventsSlice.actions.remove(eventId1),
      );

      expect(state.eventIds).not.toContain(eventId1);
      expect(state.eventIds).toContain(eventId2);
      expect(state.eventIds).toHaveLength(1);
    });
  });

  describe("clear", () => {
    it("should clear all pending event IDs", () => {
      const eventId1 = "event-123";
      const eventId2 = "event-456";

      let state = pendingEventsSlice.reducer(
        initialState,
        pendingEventsSlice.actions.add(eventId1),
      );
      state = pendingEventsSlice.reducer(
        state,
        pendingEventsSlice.actions.add(eventId2),
      );
      state = pendingEventsSlice.reducer(
        state,
        pendingEventsSlice.actions.clear(),
      );

      expect(state.eventIds).toHaveLength(0);
      expect(state.eventIds).not.toContain(eventId1);
      expect(state.eventIds).not.toContain(eventId2);
    });

    it("should handle clearing empty list", () => {
      const state = pendingEventsSlice.reducer(
        initialState,
        pendingEventsSlice.actions.clear(),
      );

      expect(state.eventIds).toHaveLength(0);
    });
  });
});
