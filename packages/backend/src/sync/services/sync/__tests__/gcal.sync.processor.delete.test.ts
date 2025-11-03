import { faker } from "@faker-js/faker";
import { CompassCalendarSchema } from "@core/types/calendar.types";
import {
  Categories_Recurrence,
  EventStatus,
  RegularEventSchema,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { StringV4Schema } from "@core/types/type.utils";
import {
  categorizeEvents,
  isAllDay,
  isBase,
  isInstance,
  isRegular,
} from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import userService from "@backend/user/services/user.service";

describe("GcalSyncProcessor: DELETE", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should delete a STANDALONE event", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gcal = await getGcalClient(user._id);

    await userService.restartGoogleCalendarSync(user._id);

    const origEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const regularEvent = RegularEventSchema.parse(origEvents.find(isRegular));

    const gcalRegularEvent = await gcalService.getEvent(
      gcal,
      StringV4Schema.parse(regularEvent?.metadata?.id),
      calendar.metadata.id,
    );

    expect(gcalRegularEvent).toBeDefined();

    /* A;ct: Simulate a cancelled event from Gcal */
    const cancelledGStandalone = {
      ...gcalRegularEvent,
      status: EventStatus.CANCELLED,
    };

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: cancelledGStandalone },
    ]);

    /* Assert: Should return a DELETED change */
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      calendar: calendar._id,
      user: user._id,
      id: regularEvent._id,
      title: cancelledGStandalone.summary,
      operation: "REGULAR_DELETED",
    });

    // Verify the event is deleted from the DB
    const remainingEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const { regularEvents } = categorizeEvents(remainingEvents);

    const eventIsGone = regularEvents.find(
      (e) => e.metadata?.id === gcalRegularEvent.id,
    );

    expect(eventIsGone).toBeUndefined();

    // Verify no other events deleted
    expect(remainingEvents).toHaveLength(origEvents.length - 1);
  });

  it("should delete an INSTANCE after cancelling it", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gcal = await getGcalClient(user._id);

    await userService.restartGoogleCalendarSync(user._id);

    const events = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const dbEvent = faker.helpers.arrayElement(events.filter(isInstance));

    expect(dbEvent).toBeDefined();

    const gcalEvent = await gcalService.getEvent(
      gcal,
      StringV4Schema.parse(dbEvent?.metadata?.id),
      calendar.metadata.id,
    );

    const cancelledGcalInstance = {
      ...gcalEvent,
      status: EventStatus.CANCELLED,
    };

    /* Act */
    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: cancelledGcalInstance },
    ]);

    /* Assert */
    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: dbEvent._id,
          title: cancelledGcalInstance.summary,
          category: Categories_Recurrence.RECURRENCE_INSTANCE,
          operation: "RECURRENCE_INSTANCE_DELETED",
        }),
      ]),
    );

    const remainingEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    // Verify only the instance was deleted
    expect(remainingEvents).toHaveLength(events.length - 1);

    expect(
      remainingEvents.find(
        ({ recurrence, metadata }) =>
          recurrence?.eventId.equals(dbEvent.recurrence?.eventId) &&
          metadata?.id === gcalEvent.id,
      ),
    ).toBeUndefined();
  });

  it("should handle a mixed payload of multiple INSTANCE DELETIONS and one BASE UPSERT", async () => {
    // This scenario happens when a user updates a series that includes multiple instance exceptions

    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendars = await calendarService.getAllByUser(user._id);
    const gcal = await getGcalClient(user._id);

    await userService.restartGoogleCalendarSync(user._id);

    const events = await getEventsInDb({
      calendar: { $in: calendars.map((c) => c._id) },
      isSomeday: false,
    });

    const instances = events.filter(isInstance);

    const allDayDbInstances = faker.helpers.arrayElements(
      instances.filter(isAllDay),
      { min: 2, max: 4 },
    );

    const timedDbBase = faker.helpers.arrayElement(
      events.filter((e) => !isAllDay(e)).filter(isBase),
    );

    const timedDbInstances = instances.filter((e) =>
      e.recurrence?.eventId.equals(timedDbBase._id),
    );

    const updatedTimedDbInstances = faker.helpers.arrayElements(
      timedDbInstances,
      { min: 1, max: 2 },
    );

    const dbBaseCalendar = calendars.find((c) =>
      c._id.equals(timedDbBase.calendar),
    );

    expect(dbBaseCalendar).toBeDefined();

    const baseGcalEvent = await gcalService.getEvent(
      gcal,
      StringV4Schema.parse(timedDbBase?.metadata?.id),
      CompassCalendarSchema.parse(dbBaseCalendar).metadata.id,
    );

    const timedGcalEvents = await Promise.all(
      updatedTimedDbInstances.map((i) => {
        const calendar = calendars.find((c) => c._id.equals(i.calendar));

        return gcalService.getEvent(
          gcal,
          StringV4Schema.parse(i.metadata?.id),
          CompassCalendarSchema.parse(calendar).metadata.id,
        );
      }),
    );

    const allDayGcalEvents = await Promise.all(
      allDayDbInstances.map((i) => {
        const calendar = calendars.find((c) => c._id.equals(i.calendar));

        return gcalService.getEvent(
          gcal,
          StringV4Schema.parse(i.metadata?.id),
          CompassCalendarSchema.parse(calendar).metadata.id,
        );
      }),
    );

    // Create update payloads for each  timed instance
    const baseGcalUpdate = {
      ...baseGcalEvent,
      summary: `${baseGcalEvent.summary} UPDATED`,
    };

    // Create update payloads for each updatedTimedDbInstances
    const updates: gSchema$Event[] = timedGcalEvents.map((i) => ({
      ...i,
      summary: `${i.summary} SOME TIMED INSTANCE UPDATED`,
    }));

    // Create cancellation payloads for each allDay instance
    const cancellations: gSchema$Event[] = allDayGcalEvents.map((i) => ({
      ...i,
      status: EventStatus.CANCELLED,
    }));

    /* Act */
    const changes = await GcalEventsSyncProcessor.processEvents(
      [baseGcalUpdate, ...updates, ...cancellations].map((payload) => {
        const dbEvent = events.find((e) => e.metadata?.id === payload.id);
        const calendar = CompassCalendarSchema.parse(
          calendars.find((c) => c._id.equals(dbEvent?.calendar)),
        );

        return { calendar, payload };
      }),
    );

    /* Assert */
    // Validate all changes detected
    expect(changes).toHaveLength(updates.length + cancellations.length + 1);

    // Validate change types
    const baseUpdate = changes.filter((c) =>
      c.operation?.includes("SERIES_UPDATED"),
    );

    const timedInstancesUpdate = changes.filter((c) =>
      c.operation?.includes("RECURRENCE_INSTANCE_UPDATED"),
    );

    const instanceDeletes = changes.filter((c) =>
      c.operation?.includes("RECURRENCE_INSTANCE_DELETED"),
    );

    expect(baseUpdate).toHaveLength(1);
    expect(timedInstancesUpdate).toHaveLength(updates.length);
    expect(instanceDeletes).toHaveLength(cancellations.length);

    // Validate DB state
    const remainingEvents = await getEventsInDb({
      calendar: { $in: calendars.map((c) => c._id) },
      isSomeday: false,
    });

    const { baseEvents, instances: updatedInstances } =
      categorizeEvents(remainingEvents);

    const updatedTimedBaseEvent = baseEvents.find((e) =>
      e._id.equals(timedDbBase._id),
    );
    // Validate base exists
    expect(updatedTimedBaseEvent).toBeDefined();
    expect(updatedTimedBaseEvent?.title).toBe(baseGcalUpdate.summary);

    const updatedTimedBaseInstances = updatedInstances.filter((i) =>
      i.recurrence?.eventId.equals(timedDbBase._id),
    );

    const timedBaseInstancedWithCascadingUpdates =
      updatedTimedBaseInstances.filter(
        (i) => i.title === baseGcalUpdate.summary,
      );

    expect(timedBaseInstancedWithCascadingUpdates).toHaveLength(
      timedDbInstances.length - updates.length,
    );

    const timedBaseInstancedWithIndividualUpdates =
      updatedTimedBaseInstances.filter((i) =>
        i.title.endsWith("SOME TIMED INSTANCE UPDATED"),
      );

    expect(timedBaseInstancedWithIndividualUpdates).toHaveLength(
      updates.length,
    );

    // Validate instances were cancelled and deleted
    expect(
      updatedInstances.find((i) =>
        cancellations.some((c) => c.id === i.metadata?.id),
      ),
    ).toBeUndefined();
  });

  it("should delete all INSTANCES and BASE after cancelling a BASE", async () => {
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gcal = await getGcalClient(user._id);

    await userService.restartGoogleCalendarSync(user._id);

    const events = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const dbBase = faker.helpers.arrayElement(events.filter(isBase));

    const baseGcalEvent = await gcalService.getEvent(
      gcal,
      StringV4Schema.parse(dbBase?.metadata?.id),
      calendar.metadata.id,
    );

    // Cancel the entire series
    const cancelledBase = {
      ...baseGcalEvent,
      status: EventStatus.CANCELLED,
    };

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: cancelledBase },
    ]);

    expect(changes).toHaveLength(1);

    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          calendar: calendar._id,
          user: user._id,
          id: dbBase._id,
          title: cancelledBase.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_DELETED",
        }),
      ]),
    );

    // Verify all Compass events that match the gcal base were deleted
    const updatedEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
      "recurrence.eventId": dbBase._id,
    });

    expect(updatedEvents).toHaveLength(0);
  });
});
