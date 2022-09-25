import { gcalEvents } from "../../../core/src/__mocks__/events/gcal/gcal.event";
import { cancelledEventsIds } from "../common/services/gcal/gcal.utils";
import { categorizeGcalEvents } from "../sync/services/sync.utils";

describe("categorizeGcalEvents", () => {
  const { toDelete, toUpdate } = categorizeGcalEvents(gcalEvents.items);

  describe("eventsToDelete", () => {
    it("returns array of cancelled gEventIds", () => {
      expect(toDelete.length).toBeGreaterThan(0);

      // should be array of string numbers
      expect(typeof toDelete[1]).toBe("string");
      const parsedToInt = parseInt(toDelete[1]);
      expect(typeof parsedToInt).toBe("number");
    });
    it("finds deleted/cancelled events", () => {
      const cancelledIds = cancelledEventsIds(gcalEvents.items);
      gcalEvents.items.forEach((e) => {
        if (e.status === "cancelled") {
          cancelledIds.push(e.id);
        }
      });

      toDelete.forEach((e) => {
        if (cancelledIds.includes(e.id)) {
          throw new Error("a cancelled event was missed");
        }
      });
    });
  });

  it("doesn't put the same id in both the delete and update list", () => {
    toUpdate.forEach((e) => {
      if (toDelete.includes(e.id)) {
        throw new Error("An event was found in the delete and update category");
      }
    });
  });
});

/*

describe("assembleBulkOperations", () => {
  const bulkOps = assembleBulkOperations(
    "user2",
    ["id1", "id2"],
    gcalEvents.items
  );
  it("sets origin to google for updated events", () => {
    const updateOps = bulkOps.filter((o) => o.updateOne !== undefined);
    updateOps.forEach((o) => {
      const origin = o.updateOne.update.$set.origin;
      expect(origin).toEqual(Origin.GOOGLE);
    });
  });
});
*/
