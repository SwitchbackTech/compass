import dayjs from "dayjs";
import { ObjectId } from "mongodb";
import { gcalEvents } from "@core/__mocks__/v1/events/gcal/gcal.event";
import { Event_Core } from "@core/types/event.types";
import {
  createMockBaseEvent,
  createMockInstance,
} from "@core/util/test/ccal.event.factory";
import { generateGcalId } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { syncExpired, syncExpiresSoon } from "@backend/sync/util/sync.util";
import { gSchema$Event } from "../../../../../core/src/types/gcal";
import {
  assignIdsToEvents,
  organizeGcalEventsByType,
} from "./sync.import.util";

describe("categorizeGcalEvents", () => {
  const { toDelete, toUpdate } = organizeGcalEventsByType(gcalEvents.items);

  describe("eventsToDelete", () => {
    it("returns array of cancelled gEventIds", () => {
      expect(toDelete.length).toBeGreaterThan(0);

      // should be array of string numbers
      expect(typeof toDelete[1]).toBe("string");
      const parsedToInt = parseInt(toDelete[1] ?? "");
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

describe("Sync Expiry Checks", () => {
  it("returns true if expiry before now", () => {
    const expired = "1675097074000"; // Jan 30, 2023
    const isExpired = syncExpired(expired);
    expect(isExpired).toBe(true);
  });

  it("returns true if expires soon - v1", () => {
    const oneMinFromNow = dayjs().add(1, "second").valueOf().toString();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });

  it("returns true if expires soon - v2", () => {
    const oneMinFromNow = dayjs().add(1, "minute").valueOf().toString();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });

  it("returns true if expires soon - v3", () => {
    const oneMinFromNow = dayjs().add(1, "day").valueOf().toString();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });
  it("returns false if expiry after now", () => {
    const notExpired = "2306249074000"; // Jan 30, 2043
    const isExpired = syncExpired(notExpired);
    expect(isExpired).toBe(false);
  });

  it("returns false if doesnt expires soon - v2", () => {
    const manyDaysFromNow = dayjs().add(50, "days").valueOf().toString();
    const expiresSoon = syncExpiresSoon(manyDaysFromNow);
    expect(expiresSoon).toBe(false);
  });
});

const getEventsWithoutIds = () => {
  // Create a base event with a Google ID
  const baseEvent = createMockBaseEvent();
  const baseGEventId = generateGcalId();

  baseEvent.gEventId = baseGEventId;

  delete (baseEvent as Partial<typeof baseEvent>)._id;

  const gEventId = baseEvent.gEventId as string;

  // Create instances that reference the base event's Google ID
  const instance1 = createMockInstance(baseGEventId, gEventId, {});
  const instance2 = createMockInstance(baseGEventId, gEventId, {});

  // delete _ids to simulate a newly mapped event
  delete (instance1 as Partial<typeof instance1>)._id;
  delete (instance1 as Partial<typeof instance1>).recurrence;
  delete (instance2 as Partial<typeof instance2>)._id;
  delete (instance2 as Partial<typeof instance2>).recurrence;

  const eventsWithoutIds = [baseEvent, instance1, instance2];

  return eventsWithoutIds;
};

describe("assignIdsToEvents", () => {
  it("assigns Mongo ObjectIds to events", () => {
    const eventsWithoutIds = getEventsWithoutIds() as Event_Core[];

    const events = assignIdsToEvents(eventsWithoutIds);

    // Verify all events have ObjectIds
    for (const event of events) {
      expect(event?._id).toBeDefined();
      expect(event._id).toBeInstanceOf(ObjectId);
    }
  });

  it("links instances to base events", () => {
    const eventsWithoutIds = getEventsWithoutIds() as Event_Core[];

    const events = assignIdsToEvents(eventsWithoutIds);

    const baseEvent = events.find((event) => event.recurrence?.rule);

    expect(baseEvent).toBeDefined();

    console.log(events);

    const instances = events.filter((event) => event.recurrence?.eventId);

    expect(instances).toHaveLength(2);

    for (const instance of instances) {
      expect(instance.recurrence?.eventId).toBe(baseEvent?._id?.toString());
    }
  });
});
