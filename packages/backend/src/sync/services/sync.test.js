import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.helpers";

import { gcalEventsExample, calendarListExample } from "./sync.test.data";
import {
  categorizeGcalEvents,
  channelNotFound,
  findCalendarByResourceId,
} from "./sync.helpers";

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
    const notFound1 = channelNotFound(calendarListExample, "channel1");
    expect(notFound1).toBe(false);

    const notFound2 = channelNotFound(calendarListExample, "oldChannelId");
    expect(notFound2).toBe(true);
  });
});

describe("Miscellaneous", () => {
  test("finds resourceId", () => {
    const cal = findCalendarByResourceId("resource2", calendarListExample);
    const resourceId = cal.sync.resourceId;
    expect(resourceId).toBe("resource2");
  });
});
