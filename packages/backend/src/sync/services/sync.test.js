import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";

import { gcalEventsExample } from "./sync.test.data";
import { categorizeGcalEvents } from "./sync.service.helpers";
describe("Categorize GCal Updates", () => {
  const toDelete = cancelledEventsIds(gcalEventsExample);
  const categorized = categorizeGcalEvents(gcalEventsExample);

  test("returns array of cancelled gEventIds", () => {
    expect(toDelete.length).toBeGreaterThan(0);

    // should be array of string numbers
    expect(typeof toDelete[1]).toBe("string");
    const parsedToInt = parseInt(toDelete[1]);
    expect(typeof parsedToInt).toBe("number");
  });
  test("finds deleted/cancelled events", () => {
    const cancelledIds = [];
    gcalEventsExample.forEach((e) => {
      if (e.status === "cancelled") {
        cancelledIds.push(e.id);
      }
    });

    categorized.eventsToDelete.forEach((e) => {
      if (!cancelledIds.includes(e.id)) {
        throw new Error("a cancelled event was missed");
      }
    });
  });
});
