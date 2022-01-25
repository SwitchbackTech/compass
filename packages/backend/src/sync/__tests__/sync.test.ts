import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.helpers";
import { Origin } from "@core/core.constants";

import { gcalEventsExample, calendarListExample } from "./sync.test.data";
import {
  categorizeGcalEvents,
  channelNotFound,
  findCalendarByResourceId,
  hasExpectedHeaders,
} from "../services/sync.helpers";

describe("categorizeGcalEvents", () => {
  const { eventsToDelete, eventsToUpdate } =
    categorizeGcalEvents(gcalEventsExample);

  describe("eventsToUpdate", () => {
    it("excludes events with compass origin", () => {
      eventsToUpdate.forEach((e) => {
        if (e.extendedProperties?.private?.origin === Origin.Compass) {
          throw new Error("an event with the compass orign wasnt excluded");
        }
      });
    });
  });

  describe("eventsToDelete", () => {
    it("returns array of cancelled gEventIds", () => {
      expect(eventsToDelete.length).toBeGreaterThan(0);

      // should be array of string numbers
      expect(typeof eventsToDelete[1]).toBe("string");
      const parsedToInt = parseInt(eventsToDelete[1]);
      expect(typeof parsedToInt).toBe("number");
    });
    it("finds deleted/cancelled events", () => {
      const cancelledIds = cancelledEventsIds(gcalEventsExample);
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

  it("doesn't put the same id in both the delete and update list", () => {
    eventsToUpdate.forEach((e) => {
      if (eventsToDelete.includes(e.id)) {
        throw new Error("An event was found in the delete and update category");
      }
    });
  });
});

describe("channelNotFound", () => {
  it("can identify if a channel is expired/no found", () => {
    const notFound1 = channelNotFound(calendarListExample, "channel1");
    expect(notFound1).toBe(false);

    const notFound2 = channelNotFound(calendarListExample, "oldChannelId");
    expect(notFound2).toBe(true);
  });
});

describe("Miscellaneous", () => {
  it("finds resourceId", () => {
    const cal = findCalendarByResourceId("resource2", calendarListExample);
    const resourceId = cal.sync.resourceId;
    expect(resourceId).toBe("resource2");
  });

  it("validates Gcal sync headers", () => {
    const headers = {
      "x-goog-channel-id": "123abc",
      "x-goog-resource-id": "123abc",
      "x-goog-resource-state": "123abc",
      "x-goog-channel-expiration": "123abc",
    };

    expect(hasExpectedHeaders(headers)).toBe(true);
    delete headers["x-goog-channel-id"];
    expect(hasExpectedHeaders(headers)).toBe(false);
  });

  it("idk headers", () => {
    const headers = {
      host: "localhost:3000",
      connection: "close",
      "content-length": "0",
      accept: "*/*",
      "ffx-goog-channel-id": "primary-c338bd69-12d5-4cf2-99b5-10d568d152b8",
      "x-goog-channel-expiration": "Tue, 25 Jan 2022 19:22:58 GMT",
      "x-goog-resource-state": "sync",
      "x-goog-message-number": "1",
      "x-goog-resource-id": "vLDjaX7kI9LbiqW3M-Op50Mf_kA",
      "x-goog-resource-uri":
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?alt=json",
      "user-agent":
        "APIs-Google; (+https://developers.google.com/webmasters/APIs-Google.html)",
      "accept-encoding": "gzip, deflate, br",
    };

    expect(hasExpectedHeaders(headers)).toBe(true);
  });
});
