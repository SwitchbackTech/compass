import { ID_OPTIMISTIC_PREFIX } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { Schema_Event } from "@core/types/event.types";
import { replaceIdWithOptimisticId } from "@web/common/utils/event.util";

// Test the duplicate event logic directly
describe("Duplicate Event Logic", () => {
  it("should generate a new optimistic ID when duplicating an event", () => {
    const originalEvent: Schema_Event = {
      _id: "original-event-id",
      title: "Test Event",
      startDate: "2025-04-10T10:00:00Z",
      endDate: "2025-04-10T11:00:00Z",
      isAllDay: false,
      isSomeday: false,
    };

    // Simulate the duplicate logic from useDraftActions
    const draftWithoutProvider = MapEvent.removeProviderData({
      ...originalEvent,
    });

    // Remove the original _id and generate a new optimistic ID for duplication
    const { _id, ...draftWithoutId } = draftWithoutProvider;
    const duplicatedDraft = replaceIdWithOptimisticId(draftWithoutId as any);

    // Verify the original _id is removed
    expect(draftWithoutId).not.toHaveProperty("_id");

    // Verify a new optimistic ID is generated
    expect(duplicatedDraft._id).toMatch(
      new RegExp(`^${ID_OPTIMISTIC_PREFIX}-`),
    );
    expect(duplicatedDraft._id).not.toBe(originalEvent._id);

    // Verify other properties are preserved
    expect(duplicatedDraft.title).toBe(originalEvent.title);
    expect(duplicatedDraft.startDate).toBe(originalEvent.startDate);
    expect(duplicatedDraft.endDate).toBe(originalEvent.endDate);
    expect(duplicatedDraft.isAllDay).toBe(originalEvent.isAllDay);
    expect(duplicatedDraft.isSomeday).toBe(originalEvent.isSomeday);
  });

  it("should handle duplicate event without an existing _id", () => {
    const eventWithoutId: Omit<Schema_Event, "_id"> = {
      title: "New Event",
      startDate: "2025-04-10T10:00:00Z",
      endDate: "2025-04-10T11:00:00Z",
      isAllDay: false,
      isSomeday: false,
    };

    // Simulate the duplicate logic from useDraftActions
    const draftWithoutProvider = MapEvent.removeProviderData({
      ...eventWithoutId,
    });

    const { _id, ...draftWithoutId } = draftWithoutProvider;
    const duplicatedDraft = replaceIdWithOptimisticId(draftWithoutId as any);

    // Should still generate an optimistic ID even if original had no _id
    expect(duplicatedDraft._id).toMatch(
      new RegExp(`^${ID_OPTIMISTIC_PREFIX}-`),
    );
    expect(duplicatedDraft.title).toBe(eventWithoutId.title);
    expect(duplicatedDraft.startDate).toBe(eventWithoutId.startDate);
    expect(duplicatedDraft.endDate).toBe(eventWithoutId.endDate);
  });
});
