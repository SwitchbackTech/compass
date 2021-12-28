import { cancelledEventsIds } from "@common/services/gcal/gcal.helpers";

import { gcalEventsExample, calendarsExample } from "./sync.test.data";
import { categorizeGcalEvents, channelExpired } from "./sync.helpers";

describe("Categorize GCal Updates", () => {
  const { eventsToDelete, eventsToUpdate } =
    categorizeGcalEvents(gcalEventsExample);

  test("Returns array of cancelled gEventIds", () => {
    expect(eventsToDelete.length).toBeGreaterThan(0);

    // should be array of string numbers
    expect(typeof eventsToDelete[1]).toBe("string");
    const parsedToInt = parseInt(eventsToDelete[1]);
    expect(typeof parsedToInt).toBe("number");
  });

  test("Event doesn't exist in delete and update category", () => {
    eventsToUpdate.forEach((e) => {
      if (eventsToDelete.includes(e.id)) {
        throw new Error("An event was found in the delete and update category");
      }
    });
  });

  test("Finds deleted/cancelled events", () => {
    const cancelledIds = cancelledEventsIds(gcalEventsExample);
    // const cancelledIds = [];
    gcalEventsExample.forEach((e) => {
      if (e.status === "cancelled") {
        cancelledIds.push(e.id);
      }
    });

    eventsToDelete.forEach((e) => {
      if (cancelledIds.includes(e.id)) {
        throw new Error("a cancelled event was missed");
      }
    });
  });
});

describe("Refreshes channel watch", () => {
  test("Decides if channel is expired", () => {
    const isExpired1 = channelExpired(calendarsExample, "channel1");
    expect(isExpired1).toBe(true);

    const isExpired2 = channelExpired(calendarsExample, "oldChannelId");
    expect(isExpired2).toBe(false);
  });
});
