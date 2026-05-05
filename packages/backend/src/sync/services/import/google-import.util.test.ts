import { gcalEvents } from "@core/__mocks__/v1/events/gcal/gcal.event";
import { type gSchema$Event } from "@core/types/gcal";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { organizeGcalEventsByType } from "@backend/sync/services/import/google-import.util";

describe("categorizeGcalEvents", () => {
  const { toDelete, toUpdate } = organizeGcalEventsByType(gcalEvents.items);

  describe("eventsToDelete", () => {
    it("returns array of cancelled gEventIds", () => {
      expect(toDelete.length).toBeGreaterThan(0);

      // should be array of string numbers
      expect(typeof toDelete[1]).toBe("string");
      const parsedToInt = parseInt(toDelete[1] ?? "", 10);
      expect(typeof parsedToInt).toBe("number");
    });
    it("finds deleted/cancelled events", () => {
      const cancelledIds = cancelledEventsIds(gcalEvents.items);
      gcalEvents.items.forEach((e) => {
        const event = e as gSchema$Event;

        if (event.status === "cancelled") {
          cancelledIds.push(event.id!);
        }
      });

      toDelete.forEach((e) => {
        const event = e as gSchema$Event;

        if (cancelledIds.includes(event.id!)) {
          throw new Error("a cancelled event was missed");
        }
      });
    });
  });

  it("doesn't put the same id in both the delete and update list", () => {
    const recurringIds = toUpdate.nonRecurring.map((e) => e.id);
    const nonRecurringIds = toUpdate.nonRecurring.map((e) => e.id);
    const allIds = [...recurringIds, ...nonRecurringIds];

    allIds.forEach((e) => {
      if (toDelete.includes(e!)) {
        throw new Error("An event was found in the delete and update category");
      }
    });
  });
});
