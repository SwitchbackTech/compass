import { ObjectId } from "mongodb";
import {
  Categories_Recurrence,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { gSchema$EventBase } from "@core/types/gcal";
import { categorizeEvents } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { simulateGoogleCalendarEventCreation } from "@backend/__tests__/helpers/mock.events.init";
import {
  mockRecurringGcalBaseEvent,
  mockRecurringGcalInstances,
} from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import {
  datesAreInUtcOffset,
  eventsMatchSchema,
  getLatestEventsFromDb,
  hasNewUpdatedAtTimestamp,
  instanceDataMatchCompassBase,
  instanceDataMatchesGcalBase,
} from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";

describe("GcalSyncProcessor UPSERT: BASE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle CREATING a TIMED SERIES from a BASE", async () => {
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const gcal = await getGcalClient(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gCalendarId = calendar.metadata.id;

    const baseRecurringGcalEvent = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(baseRecurringGcalEvent);

    //simulate event creation in Google Calendar
    await simulateGoogleCalendarEventCreation(
      gCalendarId,
      baseRecurringGcalEvent,
      gcal,
    );

    await Promise.all(
      instances.map((instance) =>
        simulateGoogleCalendarEventCreation(gCalendarId, instance, gcal),
      ),
    );

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: baseRecurringGcalEvent },
    ]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: baseRecurringGcalEvent.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: [
            null,
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });
    eventsMatchSchema(updatedEvents);
  });

  it("should handle CREATING an ALLDAY SERIES from a BASE", async () => {
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const gcal = await getGcalClient(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gCalendarId = calendar.metadata.id;

    const allDayBase: gSchema$EventBase = mockRecurringGcalBaseEvent({}, true);
    const instances = mockRecurringGcalInstances(allDayBase);

    //simulate event creation in Google Calendar
    await simulateGoogleCalendarEventCreation(gCalendarId, allDayBase, gcal);

    await Promise.all(
      instances.map((instance) =>
        simulateGoogleCalendarEventCreation(gCalendarId, instance, gcal),
      ),
    );

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: allDayBase },
    ]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: allDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: [
            null,
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });

    eventsMatchSchema(updatedEvents);
  });

  it("should handle UPDATING an ALL-DAY SERIES", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const gcal = await getGcalClient(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gCalendarId = calendar.metadata.id;

    const allDayBase: gSchema$EventBase = mockRecurringGcalBaseEvent({}, true);
    const instances = mockRecurringGcalInstances(allDayBase);

    //simulate event creation in Google Calendar
    await simulateGoogleCalendarEventCreation(gCalendarId, allDayBase, gcal);

    await Promise.all(
      instances.map((instance) =>
        simulateGoogleCalendarEventCreation(gCalendarId, instance, gcal),
      ),
    );

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: allDayBase },
    ]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: allDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: [
            null,
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    const updatedEvents = await getEventsInDb({ user: user._id.toString() });

    eventsMatchSchema(updatedEvents);

    const origEvents = await getEventsInDb({ user: user._id.toString() });

    const { instances: origInstances } = categorizeEvents(origEvents);

    /* Act */
    const updatedGcalAllDayBase = {
      ...allDayBase,
      summary: `${allDayBase.summary} - UPDATED IN GCAL`,
      description: "ALL-DAY Description adjusted in Gcal",
    };

    const updateChanges = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: updatedGcalAllDayBase },
    ]);

    /* Assert */
    // Validate the correct change was detected
    expect(updateChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: updatedGcalAllDayBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: [
            "RECURRENCE_BASE",
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          operation: "SERIES_UPDATED",
        }),
      ]),
    );

    // Validate that all events in the series (base and instances) were updated
    const { base, instances: updatedInstances } = await getLatestEventsFromDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    expect(base).toBeDefined();
    expect(base).not.toBeNull();
    expect(updatedInstances.length).toBeGreaterThan(0);

    for (const i of updatedInstances) {
      instanceDataMatchesGcalBase(i, updatedGcalAllDayBase);
      instanceDataMatchCompassBase(i, base!);
      hasNewUpdatedAtTimestamp(i, origInstances);
    }
  });

  it("should handle processing a TIMED SERIES", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const gcal = await getGcalClient(user._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gCalendarId = calendar.metadata.id;

    const timedBase: gSchema$EventBase = mockRecurringGcalBaseEvent();
    const instances = mockRecurringGcalInstances(timedBase);

    //simulate event creation in Google Calendar
    await simulateGoogleCalendarEventCreation(gCalendarId, timedBase, gcal);

    await Promise.all(
      instances.map((instance) =>
        simulateGoogleCalendarEventCreation(gCalendarId, instance, gcal),
      ),
    );

    const origEvents = await getEventsInDb({ user: user._id.toString() });

    const { instances: origInstances } = categorizeEvents(origEvents);

    /* Act */
    const updatedGcalBase = {
      ...timedBase,
      summary: timedBase.summary + " - UPDATED IN GCAL",
      description: "Description adjusted in Gcal",
    };

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: updatedGcalBase },
    ]);

    /* Assert */
    // Validate the correct change was detected
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: updatedGcalBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          transition: [
            null,
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
          operation: "SERIES_CREATED",
        }),
      ]),
    );

    // Validate that all events in the series (base and instances) were updated
    const { base, instances: updatedInstances } = await getLatestEventsFromDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    expect(updatedInstances.length).toBeGreaterThan(0);

    for (const i of updatedInstances) {
      instanceDataMatchesGcalBase(i, updatedGcalBase);
      instanceDataMatchCompassBase(i, base!);
      hasNewUpdatedAtTimestamp(i, origInstances);
      datesAreInUtcOffset(i);
    }
  });
});
