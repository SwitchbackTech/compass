import { ObjectId } from "mongodb";
import { faker } from "@faker-js/faker/.";
import {
  Categories_Recurrence,
  EventMetadataSchema,
  EventStatus,
  RecurrenceRuleSchema,
  TransitionCategoriesRecurrence,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { isAllDay, isBase, isInstance } from "@core/util/event/event.util";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { CalendarDriver } from "@backend/__tests__/drivers/calendar.driver";
import { getEventsInDb } from "@backend/__tests__/helpers/mock.db.queries";
import {
  cleanupCollections,
  cleanupTestDb,
  setupTestDb,
} from "@backend/__tests__/helpers/mock.db.setup";
import {
  baseHasRecurrenceRule,
  noInstancesAfterSplitDate,
  updateBasePayloadToExpireOneDayAfterFirstInstance,
} from "@backend/sync/services/sync/__tests__/gcal.sync.processor.test.util";
import { GcalEventsSyncProcessor } from "@backend/sync/services/sync/gcal.sync.processor";
import { CompassCalendarSchema } from "../../../../../../core/src/types/calendar.types";
import { StringV4Schema } from "../../../../../../core/src/types/type.utils";
import dayjs from "../../../../../../core/src/util/date/dayjs";
import { getGcalClient } from "../../../../auth/services/google.auth.service";
import calendarService from "../../../../calendar/services/calendar.service";
import gcalService from "../../../../common/services/gcal/gcal.service";
import userService from "../../../../user/services/user.service";

describe("GcalSyncProcessor: UPSERT: BASE SPLIT", () => {
  beforeAll(setupTestDb);

  beforeEach(cleanupCollections);

  beforeEach(cleanupCollections);

  afterAll(cleanupTestDb);

  it("should handle new UNTIL in BASE by updating BASE rule and recreating the instances", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendars = await calendarService.getAllByUser(user._id);
    const gcal = await getGcalClient(user._id);

    await userService.restartGoogleCalendarSync(user._id);

    const origEvents = await getEventsInDb({
      calendar: { $in: calendars.map((c) => c._id) },
      isSomeday: false,
    });

    const baseEvents = origEvents.filter((e) => !isAllDay(e)).filter(isBase);
    const baseEvent = faker.helpers.arrayElement(baseEvents);

    const _calendar = calendars.find((c) => c._id.equals(baseEvent.calendar));
    const calendar = CompassCalendarSchema.parse(_calendar);
    const gCalendarId = calendar.metadata.id;

    expect(baseEvent).toBeDefined();

    const instances = origEvents.filter((e) =>
      e.recurrence?.eventId.equals(baseEvent._id),
    );

    expect(instances.length).toBeGreaterThan(1);

    const firstInstance = instances.find((i) =>
      dayjs(i.originalStartDate).isSame(baseEvent.startDate),
    );

    expect(firstInstance).toBeDefined();

    const gcalBaseEvent = await gcalService.getEvent(
      gcal,
      EventMetadataSchema.parse(baseEvent.metadata).id,
      gCalendarId,
    );

    expect(gcalBaseEvent).toBeDefined();

    const gcalInstanceEvent = await gcalService.getEvent(
      gcal,
      EventMetadataSchema.parse(firstInstance?.metadata).id,
      gCalendarId,
    );

    expect(gcalInstanceEvent).toBeDefined();

    const { gBaseWithUntil, untilDateStr } =
      updateBasePayloadToExpireOneDayAfterFirstInstance({
        instances: [
          {
            ...gcalInstanceEvent,
            id: StringV4Schema.parse(gcalInstanceEvent.id),
            recurringEventId: StringV4Schema.parse(
              gcalInstanceEvent.recurringEventId,
            ),
          },
        ],
        recurring: {
          ...gcalBaseEvent,
          id: StringV4Schema.parse(gcalBaseEvent.id),
          recurrence: RecurrenceRuleSchema.parse(gcalBaseEvent.recurrence),
        },
      });

    // simulate event update in Google Calendar
    await gcal.events.patch({
      calendarId: gCalendarId,
      eventId: gBaseWithUntil.id,
      requestBody: gBaseWithUntil,
    });

    /* Act */
    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: gBaseWithUntil },
    ]);

    /* Assert */
    // Verify the base was updated
    expect(changes).toEqual(
      expect.arrayContaining([
        {
          calendar: calendar._id,
          user: user._id,
          id: expect.any(ObjectId),
          title: gBaseWithUntil.summary,
          category: Categories_Recurrence.RECURRENCE_BASE,
          operation: "SERIES_UPDATED",
          transition: [
            "RECURRENCE_BASE",
            TransitionCategoriesRecurrence.RECURRENCE_BASE_CONFIRMED,
          ],
        },
      ]),
    );

    // Verify DB changed
    const remainingEvents = await getEventsInDb({
      calendar: calendar._id,
      $or: [
        { "metadata.id": gBaseWithUntil.id },
        { "metadata.recurringEventId": gBaseWithUntil.id },
      ],
    });
    expect(remainingEvents).not.toHaveLength(origEvents.length);

    // Verify base has new recurrence rule
    await baseHasRecurrenceRule(remainingEvents, gBaseWithUntil.recurrence);

    // Verify no instances exist after the split date
    await noInstancesAfterSplitDate(remainingEvents, untilDateStr);

    // Verify the instance before the UNTIL date still exists
    const remainingInstances = remainingEvents.filter(isInstance);

    expect(remainingInstances.length).toBeGreaterThan(0);
  });

  it("should handle cancelled instance at split point by deleting it", async () => {
    /* Assemble */
    const newUser = await AuthDriver.googleSignup();
    const user = await AuthDriver.googleLogin(newUser._id);
    const calendar = await CalendarDriver.getRandomUserCalendar(user._id);
    const gcal = await getGcalClient(user._id);
    const gCalendarId = calendar.metadata.id;

    await userService.restartGoogleCalendarSync(user._id);

    const origEvents = await getEventsInDb({
      calendar: calendar._id,
      isSomeday: false,
    });

    const instances = origEvents.filter(isInstance);
    const instance = faker.helpers.arrayElement(instances);
    const gcalInstanceEvent = await gcalService.getEvent(
      gcal,
      EventMetadataSchema.parse(instance.metadata).id,
      gCalendarId,
    );

    expect(gcalInstanceEvent).toBeDefined();

    /* Act */
    // Simulate a gcal notification payload after an instance was cancelled
    const cancelledInstance: gSchema$Event = {
      ...gcalInstanceEvent,
      status: EventStatus.CANCELLED,
    };

    const changes = await GcalEventsSyncProcessor.processEvents([
      { calendar, payload: cancelledInstance },
    ]);

    /* Assert */
    // Verify the change summary
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({
      calendar: calendar._id,
      user: user._id,
      id: expect.any(ObjectId),
      title: cancelledInstance.summary,
      category: Categories_Recurrence.RECURRENCE_INSTANCE,
      operation: "RECURRENCE_INSTANCE_DELETED",
      transition: [
        "RECURRENCE_INSTANCE",
        TransitionCategoriesRecurrence.RECURRENCE_INSTANCE_CANCELLED,
      ],
    });

    // Verify database state
    const remainingEvents = await getEventsInDb({ user: user._id.toString() });
    expect(remainingEvents.length).toBeLessThan(origEvents.length);

    // Verify the cancelled instance was removed
    const cancelledInstanceExists = remainingEvents.some(
      (e) => e.metadata?.id === cancelledInstance.id,
    );
    expect(cancelledInstanceExists).toBe(false);
  });
});
