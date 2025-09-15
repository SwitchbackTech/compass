import { Schema_Event } from "@core/types/event.types";
import { ID_OPTIMISTIC_PREFIX } from "@web/common/constants/web.constants";
import { Schema_GridEvent } from "@web/common/types/web.event.types";
import { isOptimisticEvent } from "@web/common/utils/event.util";

// Test the isEventDirty logic and new event identification
describe("Event saving logic", () => {
  const createMockEvent = (
    overrides: Partial<Schema_GridEvent> = {},
  ): Schema_GridEvent => ({
    _id: "mock-id",
    title: "",
    description: "",
    startDate: "2024-01-01T10:00:00.000Z",
    endDate: "2024-01-01T11:00:00.000Z",
    user: "user1",
    isAllDay: false,
    isSomeday: false,
    origin: "compass" as any,
    priority: "unassigned" as any,
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
      initialX: null,
      initialY: null,
      dragOffset: { y: 0 },
    },
    ...overrides,
  });

  const isEventDirty = (
    currentDraft: Schema_Event,
    originalEvent: Schema_Event | null,
  ): boolean => {
    if (!originalEvent) return true; // New event is always dirty

    // Compare relevant fields that can change in the form
    const fieldsToCompare = [
      "title",
      "description",
      "startDate",
      "endDate",
      "priority",
    ] as const;

    return fieldsToCompare.some(
      (field) => currentDraft[field] !== originalEvent[field],
    );
  };

  // Simulate the new submit logic
  const shouldSkipDirtyCheck = (draft: Schema_GridEvent): boolean => {
    return !draft._id || draft._id.startsWith(ID_OPTIMISTIC_PREFIX);
  };

  describe("isEventDirty", () => {
    it("should return true for new events (originalEvent is null)", () => {
      const newEvent = createMockEvent();
      const result = isEventDirty(newEvent, null);
      expect(result).toBe(true);
    });

    it("should return false for unchanged existing events", () => {
      const existingEvent = createMockEvent();
      const draftEvent = createMockEvent();
      const result = isEventDirty(draftEvent, existingEvent);
      expect(result).toBe(false);
    });

    it("should return true when title changes", () => {
      const existingEvent = createMockEvent({ title: "Original Title" });
      const draftEvent = createMockEvent({ title: "New Title" });
      const result = isEventDirty(draftEvent, existingEvent);
      expect(result).toBe(true);
    });
  });

  describe("new event identification", () => {
    it("should identify events without _id as new", () => {
      const newEvent = createMockEvent({ _id: undefined });
      const result = shouldSkipDirtyCheck(newEvent);
      expect(result).toBe(true);
    });

    it("should identify optimistic events as new", () => {
      const optimisticEvent = createMockEvent({
        _id: `${ID_OPTIMISTIC_PREFIX}-123`,
      });
      const result = shouldSkipDirtyCheck(optimisticEvent);
      expect(result).toBe(true);
    });

    it("should not identify existing events as new", () => {
      const existingEvent = createMockEvent({ _id: "real-id-123" });
      const result = shouldSkipDirtyCheck(existingEvent);
      expect(result).toBe(false);
    });

    it("should identify optimistic events correctly", () => {
      const optimisticEvent = createMockEvent({
        _id: `${ID_OPTIMISTIC_PREFIX}-123`,
      });
      const result = isOptimisticEvent(optimisticEvent);
      expect(result).toBe(true);

      const regularEvent = createMockEvent({ _id: "regular-123" });
      const result2 = isOptimisticEvent(regularEvent);
      expect(result2).toBe(false);
    });
  });

  describe("submit logic simulation", () => {
    it("should allow saving new events without changes", () => {
      const newEvent = createMockEvent({ _id: undefined });
      const reduxDraft = createMockEvent({ _id: undefined }); // Same values

      const isNewEvent = shouldSkipDirtyCheck(newEvent);
      const shouldDiscard = !isNewEvent && !isEventDirty(newEvent, reduxDraft);

      expect(isNewEvent).toBe(true);
      expect(shouldDiscard).toBe(false); // Should not discard new events
    });

    it("should discard unchanged existing events", () => {
      const existingEvent = createMockEvent({ _id: "existing-123" });
      const reduxDraft = createMockEvent({ _id: "existing-123" }); // Same values

      const isNewEvent = shouldSkipDirtyCheck(existingEvent);
      const shouldDiscard =
        !isNewEvent && !isEventDirty(existingEvent, reduxDraft);

      expect(isNewEvent).toBe(false);
      expect(shouldDiscard).toBe(true); // Should discard unchanged existing events
    });

    it("should save changed existing events", () => {
      const existingEvent = createMockEvent({
        _id: "existing-123",
        title: "New Title",
      });
      const reduxDraft = createMockEvent({
        _id: "existing-123",
        title: "Old Title",
      });

      const isNewEvent = shouldSkipDirtyCheck(existingEvent);
      const shouldDiscard =
        !isNewEvent && !isEventDirty(existingEvent, reduxDraft);

      expect(isNewEvent).toBe(false);
      expect(shouldDiscard).toBe(false); // Should not discard changed events
    });
  });
});

// Test the duplicateEvent functionality
describe("duplicateEvent logic", () => {
  it("should create a duplicate event without (copy) suffix", () => {
    const originalEvent: Schema_GridEvent = {
      _id: "original-123",
      title: "Meeting with team",
      description: "Weekly standup",
      startDate: "2024-01-01T10:00:00.000Z",
      endDate: "2024-01-01T11:00:00.000Z",
      user: "user1",
      isAllDay: false,
      isSomeday: false,
      origin: "compass" as any,
      priority: "unassigned" as any,
      position: {
        isOverlapping: false,
        widthMultiplier: 1,
        horizontalOrder: 1,
        initialX: null,
        initialY: null,
        dragOffset: { y: 0 },
      },
    };

    // Simulate what duplicateEvent function does
    const duplicatedEvent = { ...originalEvent };
    delete duplicatedEvent._id;

    // Verify that the duplicated event does NOT have (copy) suffix
    expect(duplicatedEvent.title).toBe("Meeting with team");
    expect(duplicatedEvent.title).not.toContain("(copy)");
    expect(duplicatedEvent._id).toBeUndefined();
    expect(duplicatedEvent.description).toBe(originalEvent.description);
    expect(duplicatedEvent.startDate).toBe(originalEvent.startDate);
    expect(duplicatedEvent.endDate).toBe(originalEvent.endDate);
  });

  it("should preserve all properties except _id when duplicating", () => {
    const originalEvent: Schema_GridEvent = {
      _id: "original-456",
      title: "Important call",
      description: "Client discussion",
      startDate: "2024-02-01T14:00:00.000Z",
      endDate: "2024-02-01T15:00:00.000Z",
      user: "user2",
      isAllDay: true,
      isSomeday: false,
      origin: "google" as any,
      priority: "high" as any,
      position: {
        isOverlapping: true,
        widthMultiplier: 0.5,
        horizontalOrder: 2,
        initialX: 100,
        initialY: 200,
        dragOffset: { y: 10 },
      },
    };

    // Simulate what duplicateEvent function does
    const duplicatedEvent = { ...originalEvent };
    delete duplicatedEvent._id;

    // Verify all properties are preserved except _id
    expect(duplicatedEvent._id).toBeUndefined();
    expect(duplicatedEvent.title).toBe("Important call");
    expect(duplicatedEvent.description).toBe("Client discussion");
    expect(duplicatedEvent.isAllDay).toBe(true);
    expect(duplicatedEvent.isSomeday).toBe(false);
    expect(duplicatedEvent.origin).toBe("google");
    expect(duplicatedEvent.priority).toBe("high");
    expect(duplicatedEvent.position).toEqual(originalEvent.position);
  });
});
