import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  createDraftEvent,
  createWebEvent,
} from "../../__tests__/utils/event.util/test.draft.util";
import { DraftParser, isDraftDirty } from "./draft.parser";

describe("DraftParser", () => {
  it("should return false when draft and original events are identical", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(false);
  });

  it("should return true when title has changed", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: "Different Title",
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when description has changed", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: "Different Description",
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when startDate has changed", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: faker.date.future().toISOString(),
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when endDate has changed", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: faker.date.future().toISOString(),
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when priority has changed", () => {
    const originalEvent = createWebEvent({ priority: Priorities.WORK });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: Priorities.SELF,
      recurrence: originalEvent.recurrence,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when recurrence is added to non-recurring event", () => {
    const originalEvent = createWebEvent({ recurrence: undefined });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when recurrence is removed from recurring event", () => {
    const originalEvent = createWebEvent({
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: undefined,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when recurrence rules have changed", () => {
    const originalEvent = createWebEvent({
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when recurrence rules array length has changed", () => {
    const originalEvent = createWebEvent({
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
    });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY", "RRULE:BYDAY=MO"] },
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return true when dates change in recurring event", () => {
    const originalEvent = createWebEvent({
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] },
      startDate: "2024-01-01T10:00:00Z",
      endDate: "2024-01-01T11:00:00Z",
    });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: "2024-01-01T11:00:00Z", // Different start time
      endDate: "2024-01-01T12:00:00Z", // Different end time
      priority: originalEvent.priority,
      recurrence: { rule: ["RRULE:FREQ=WEEKLY"] }, // Same recurrence
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(true);
  });

  it("should return false when only non-tracked fields change", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
      user: "different-user", // This field is not tracked
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(false);
  });

  it("should handle undefined recurrence gracefully", () => {
    const originalEvent = createWebEvent({ recurrence: undefined });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: undefined,
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(false);
  });

  it("should handle empty recurrence rules", () => {
    const originalEvent = createWebEvent({
      recurrence: { rule: [] },
    });
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: { rule: [] },
    });

    const parser = new DraftParser(draftEvent, originalEvent);
    expect(parser.isDirty()).toBe(false);
  });
});

describe("isDraftDirty", () => {
  it("should work as a standalone function", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: "Different Title",
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    expect(isDraftDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return false for identical events", () => {
    const originalEvent = createWebEvent();
    const draftEvent = createDraftEvent({
      title: originalEvent.title,
      description: originalEvent.description,
      startDate: originalEvent.startDate,
      endDate: originalEvent.endDate,
      priority: originalEvent.priority,
      recurrence: originalEvent.recurrence,
    });

    expect(isDraftDirty(draftEvent, originalEvent)).toBe(false);
  });
});
