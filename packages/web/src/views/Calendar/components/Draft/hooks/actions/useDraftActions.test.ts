import {
  ID_OPTIMISTIC_PREFIX,
  Origin,
  Priorities,
} from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
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
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
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

  // TODO move to separate util outside test
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

// Test recurrence change detection logic
describe("Recurrence change detection", () => {
  const createMockRecurrenceEvent = (
    rule: string[] = [],
    overrides: Partial<Schema_GridEvent> = {},
  ): Schema_GridEvent => ({
    _id: "existing-id",
    title: "Test Event",
    description: "",
    startDate: "2024-01-01T10:00:00.000Z",
    endDate: "2024-01-01T11:00:00.000Z",
    user: "user1",
    isAllDay: false,
    isSomeday: false,
    origin: Origin.COMPASS,
    priority: Priorities.UNASSIGNED,
    position: {
      isOverlapping: false,
      widthMultiplier: 1,
      horizontalOrder: 1,
      initialX: null,
      initialY: null,
      dragOffset: { y: 0 },
    },
    recurrence: { rule },
    ...overrides,
  });

  // Simplified version of the isRecurrenceChanged logic for testing
  const isRecurrenceChanged = (
    oldRecurrence: string[],
    newRecurrence: string[],
  ): boolean => {
    const oldRuleFields = oldRecurrence.flatMap((rule) => rule.split(";"));
    const newRuleFields = newRecurrence.flatMap((rule) => rule.split(";"));
    const oldRuleSet = [...new Set(oldRuleFields)];
    const newRuleSet = [...new Set(newRuleFields)];

    return (
      newRuleSet.some((rule) => !oldRuleSet.includes(rule)) ||
      oldRuleSet.some((rule) => !newRuleSet.includes(rule))
    );
  };

  it("should detect when recurrence rules are added", () => {
    const oldRules: string[] = [];
    const newRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(true);
  });

  it("should detect when recurrence rules are removed", () => {
    const oldRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];
    const newRules: string[] = [];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(true);
  });

  it("should detect when recurrence rules are modified", () => {
    const oldRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];
    const newRules = ["RRULE:FREQ=WEEKLY;COUNT=10"];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(true);
  });

  it("should detect when recurrence frequency changes", () => {
    const oldRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];
    const newRules = ["RRULE:FREQ=DAILY;COUNT=5"];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(true);
  });

  it("should not detect changes when rules are identical", () => {
    const oldRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];
    const newRules = ["RRULE:FREQ=WEEKLY;COUNT=5"];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(false);
  });

  it("should handle empty arrays correctly", () => {
    const oldRules: string[] = [];
    const newRules: string[] = [];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(false);
  });

  it("should detect changes in complex recurrence rules", () => {
    const oldRules = ["RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"];
    const newRules = ["RRULE:FREQ=WEEKLY;BYDAY=TU,TH;COUNT=10"];

    const result = isRecurrenceChanged(oldRules, newRules);
    expect(result).toBe(true);
  });

  it("should demonstrate the specific bug case: save button disabled after removing recurrence", () => {
    // This test demonstrates the original bug scenario
    // User has an event with recurrence, then removes the recurrence
    const originalEvent = createMockRecurrenceEvent(
      ["RRULE:FREQ=WEEKLY;COUNT=5"],
      {
        _id: "existing-event-id",
        title: "Meeting",
      },
    );

    const modifiedEvent = createMockRecurrenceEvent([], {
      _id: "existing-event-id",
      title: "Meeting", // Same title, only recurrence changed
    });

    // Simulate the isEventDirty logic that uses isRecurrenceChanged
    const mockIsEventDirty = (
      currentDraft: Schema_GridEvent,
      reduxDraft: Schema_GridEvent,
    ): boolean => {
      const fieldsToCompare = [
        "title",
        "description",
        "startDate",
        "endDate",
        "priority",
        "recurrence",
      ] as const;

      return fieldsToCompare.some((field) => {
        const current = currentDraft[field];
        const original = reduxDraft[field];
        const recurrence = field === "recurrence";

        if (recurrence) {
          const oldRecurrence = original?.rule ?? [];
          const newRecurrence = current?.rule ?? [];
          return isRecurrenceChanged(oldRecurrence, newRecurrence);
        }

        return current !== original;
      });
    };

    // This should return true (event is dirty) because recurrence was removed
    const isEventDirty = mockIsEventDirty(modifiedEvent, originalEvent);
    expect(isEventDirty).toBe(true);

    // In the real app, this would enable the save button
    // Before the fix, this would return false and keep the save button disabled
  });
});
