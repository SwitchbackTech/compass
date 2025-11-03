import { z } from "zod/v4";
import { EventStatus } from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { isBase, isInstance, isRegular } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import {
  getCategorizedEventsInDb,
  getEventsInDb,
} from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import { GCAL_LIST_PAGE_SIZE } from "@backend/common/constants/backend.constants";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { createSyncImport } from "@backend/sync/services/import/sync.import";

describe("SyncImport: Full", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should import the first instance of a recurring event (and the base)", async () => {
    const user = await AuthDriver.googleSignup();
    const syncImport = await createSyncImport(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    // Importing both the base and first instance helps us find the series recurrence rule.
    // To prevent duplicates in the UI, the GET API will not return the base event
    await syncImport.importAllEvents(calendar, 1);

    const currentEventsInDb = await getEventsInDb({ calendar: calendar._id });
    const baseEvent = currentEventsInDb.find(isBase)!;
    const firstInstance = currentEventsInDb.find((i) =>
      dayjs(i.originalStartDate).isSame(baseEvent.startDate),
    )!;

    expect(baseEvent).toBeDefined();
    expect(baseEvent).not.toBeNull();
    expect(firstInstance).toBeDefined();
    expect(firstInstance).not.toBeNull();

    expect(baseEvent.startDate).toEqual(firstInstance.startDate);
  });

  it("should connect instances to their base events", async () => {
    const user = await AuthDriver.googleSignup();
    const syncImport = await createSyncImport(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

    await syncImport.importAllEvents(calendar, GCAL_LIST_PAGE_SIZE);

    const { baseEvents, instances } = await getCategorizedEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    expect(baseEvents.length).toBeGreaterThan(1);
    expect(instances.length).toBeGreaterThan(1);

    instances.forEach((instance) => {
      const baseEvent = baseEvents.find((base) =>
        instance.recurrence?.eventId.equals(base._id),
      );

      expect(baseEvent).toBeDefined();

      expect(instance.recurrence?.eventId.equals(baseEvent?._id)).toBe(true);
    });
  });

  it("should include regular and recurring events and skip cancelled events", async () => {
    const user = await AuthDriver.googleSignup();
    const syncImport = await createSyncImport(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gcal = await getGcalClient(user._id);

    const { nextSyncToken } = await syncImport.importAllEvents(calendar, 1);

    const currentEventsInDb = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const gcalEvents = await Promise.all(
      currentEventsInDb.map(async ({ metadata }) => {
        const event = await gcalService.getEvent(
          gcal,
          StringV4Schema.parse(metadata?.id),
          StringV4Schema.parse(calendar.metadata.id),
        );

        return event;
      }),
    );

    expect(gcalEvents).toHaveLength(currentEventsInDb.length);

    gcalEvents.forEach((gcalEvent) => {
      expect(gcalEvent.status).not.toBe(EventStatus.CANCELLED);
    });

    // Verify we have the base events
    const baseEvents = currentEventsInDb.filter(isBase);

    expect(baseEvents.length).toBeGreaterThan(1);

    // Verify we have the correct instance
    const instanceEvents = currentEventsInDb.filter(isInstance);

    expect(instanceEvents.length).toBeGreaterThan(baseEvents.length);

    // Verify we have the regular event
    const regularEvents = currentEventsInDb.filter(isRegular);

    expect(regularEvents.length).toBeGreaterThan(1);

    // Verify sync token
    expect(z.coerce.number().safeParse(nextSyncToken).success).toBe(true);
  });

  it("should not create duplicate events for recurring events", async () => {
    const user = await AuthDriver.googleSignup();
    const syncImport = await createSyncImport(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

    await syncImport.importAllEvents(calendar, 1);

    const currentEventsInDb = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    // Get all instance events
    const instances = currentEventsInDb.filter(isInstance);

    // For each instance event, verify there are no duplicates
    const eventIds = new Set<string>();
    const duplicateEvents = instances.filter((event) => {
      if (!event.metadata?.id) return false; // Skip events without IDs
      if (eventIds.has(event.metadata.id)) {
        return true;
      }
      eventIds.add(event.metadata.id);
      return false;
    });

    expect(duplicateEvents).toHaveLength(0);
  });

  it("should not create duplicate events for regular events", async () => {
    const user = await AuthDriver.googleSignup();
    const syncImport = await createSyncImport(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);

    await syncImport.importAllEvents(calendar, 1);

    const currentEventsInDb = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const regularEvents = currentEventsInDb.filter(
      ({ recurrence }) => recurrence === undefined || recurrence === null,
    );

    expect(
      new Set(regularEvents.map(({ _id }) => _id.toString())).size,
    ).toEqual(regularEvents.length);
  });
});
