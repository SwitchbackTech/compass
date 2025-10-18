import { faker } from "@faker-js/faker";
import { gcalEvents } from "@core/__mocks__/v1/events/gcal/gcal.event";
import { gSchema$Event } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
import { cancelledEventsIds } from "@backend/common/services/gcal/gcal.utils";
import { organizeGcalEventsByType } from "@backend/sync/services/import/sync.import.util";
import { syncExpired, syncExpiresSoon } from "@backend/sync/util/sync.util";

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
    const expired = dayjs("1675097074000").toDate(); // Jan 30, 2023
    const isExpired = syncExpired(expired);
    expect(isExpired).toBe(true);
  });

  it("returns true if expires soon - v1", () => {
    const oneMinFromNow = dayjs().add(1, "second").toDate();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });

  it("returns true if expires soon - v2", () => {
    const oneMinFromNow = dayjs().add(1, "minute").toDate();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });

  it("returns true if expires soon - v3", () => {
    const oneMinFromNow = dayjs().add(1, "day").toDate();
    const expiresSoon = syncExpiresSoon(oneMinFromNow);
    expect(expiresSoon).toBe(true);
  });
  it("returns false if expiry after now", () => {
    const notExpired = faker.date.future({ years: 10 });
    const isExpired = syncExpired(notExpired);
    expect(isExpired).toBe(false);
  });

  it("returns false if doesnt expires soon - v2", () => {
    const manyDaysFromNow = faker.date.future({ years: 10 });
    const expiresSoon = syncExpiresSoon(manyDaysFromNow);
    expect(expiresSoon).toBe(false);
  });
});
