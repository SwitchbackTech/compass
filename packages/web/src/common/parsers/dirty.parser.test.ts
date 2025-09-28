import { faker } from "@faker-js/faker";
import { Priorities } from "@core/constants/core.constants";
import {
  createMockBaseEvent,
  createMockStandaloneEvent,
} from "@core/util/test/ccal.event.factory";
import { DirtyParser } from "@web/common/parsers/dirty.parser";
import { Schema_WebEvent } from "../types/web.event.types";

describe("WebEventParser", () => {
  it("should return false when draft and original events are identical", () => {
    const event = createMockStandaloneEvent() as Schema_WebEvent;

    expect(DirtyParser.isEventDirty(event, event)).toBe(false);
  });

  it("should return true when title has changed", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;
    const draftEvent = { ...originalEvent, title: faker.lorem.sentence() };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when description has changed", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;
    const draftEvent = { ...originalEvent, title: faker.lorem.paragraph() };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when startDate has changed", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;
    const startDate = faker.date.future().toISOString();
    const draftEvent = { ...originalEvent, startDate };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when endDate has changed", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;
    const endDate = faker.date.future().toISOString();
    const draftEvent = { ...originalEvent, endDate };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when priority has changed", () => {
    const originalEvent = createMockStandaloneEvent({
      priority: Priorities.WORK,
    }) as Schema_WebEvent;
    const draftEvent = { ...originalEvent, priority: Priorities.SELF };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when recurrence is added to non-recurring event", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;
    const recurrence = { rule: ["RRULE:FREQ=WEEKLY"] };
    const draftEvent = { ...originalEvent, recurrence };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when recurrence is removed from a recurring event", () => {
    const originalEvent = createMockBaseEvent() as Schema_WebEvent;
    const recurrence = undefined;
    const draftEventA = { ...originalEvent, recurrence: { rule: null } };
    const draftEventB = Object.assign({ ...originalEvent }, { recurrence });

    expect(DirtyParser.isEventDirty(draftEventA, originalEvent)).toBe(true);
    expect(DirtyParser.isEventDirty(draftEventB, originalEvent)).toBe(true);
  });

  it("should return true when recurrence rules have changed", () => {
    const originalEvent = createMockBaseEvent({
      recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    }) as Schema_WebEvent;

    const recurrence = { rule: ["RRULE:FREQ=WEEKLY"] };
    const draftEvent = { ...originalEvent, recurrence };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when recurrence rules array length has changed", () => {
    const originalEvent = createMockBaseEvent({
      recurrence: { rule: ["RRULE:FREQ=DAILY"] },
    }) as Schema_WebEvent;

    const recurrence = { rule: ["RRULE:FREQ=WEEKLY", "RRULE:BYDAY=MO"] };
    const draftEvent = { ...originalEvent, recurrence };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return true when dates change in recurring event", () => {
    const originalEvent = createMockBaseEvent({
      startDate: faker.date.past().toISOString(),
    }) as Schema_WebEvent;

    const startDate = faker.date.future().toISOString();
    const draftEvent = { ...originalEvent, startDate };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(true);
  });

  it("should return false when only non-tracked fields change", () => {
    const originalEvent = createMockStandaloneEvent() as Schema_WebEvent;

    const draftEvent = {
      ...originalEvent,
      user: faker.database.mongodbObjectId(),
      _id: faker.database.mongodbObjectId(),
      updatedAt: new Date(),
      gEventId: faker.database.mongodbObjectId(),
      gRecurringEventId: faker.database.mongodbObjectId(),
    };

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(false);
  });

  it("should handle undefined recurrence gracefully", () => {
    const recurrence = undefined;

    const originalEvent = createMockStandaloneEvent({
      recurrence,
    }) as Schema_WebEvent;

    const draftEvent = Object.assign({ ...originalEvent }, { recurrence });

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(false);
  });

  it("should handle empty recurrence rules", () => {
    const recurrence = { rule: [] };

    const originalEvent = createMockStandaloneEvent({
      recurrence,
    }) as Schema_WebEvent;

    const draftEvent = Object.assign({ ...originalEvent }, { recurrence });

    expect(DirtyParser.isEventDirty(draftEvent, originalEvent)).toBe(false);
  });
});
