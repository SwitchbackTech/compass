import { ObjectId } from "mongodb";
import { z } from "zod/v4";
import { faker } from "@faker-js/faker";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  Schema_Base_Event,
  Schema_Instance_Event,
  V0EventSchema,
} from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { createRecurrenceSeries } from "@core/util/test/ccal.event.factory";
import { AuthDriver } from "@backend/__tests__/drivers/auth.driver";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";

export class EventDriver {
  static async generateV0Data(count = 3) {
    const users = await AuthDriver.signUpGoogleUsers(count);

    const collection = mongoService.db.collection<
      z.infer<typeof V0EventSchema>
    >(mongoService.event.collectionName);

    await Promise.all(
      users.map(async (user) =>
        calendarService.initializeGoogleCalendars(
          user._id,
          await getGcalClient(user._id),
        ),
      ),
    );

    const data = users.flatMap((user) => {
      const gcalAllDayEvents = mockGcalEvents(true, { count });
      const gcalTimedEvents = mockGcalEvents(false, { count });

      const somedayEvent = V0EventSchema.parse({
        user: user._id.toString(),
        title: "Someday Event",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
        order: faker.number.int({ min: 0, max: 10 }),
        isSomeday: true,
        isAllDay: false,
        origin: Origin.COMPASS,
        priority: Priorities.UNASSIGNED,
      });

      const recurringEventIds = new Map<string, ObjectId>([
        [gcalAllDayEvents.gcalEvents.recurring.id!, new ObjectId()],
        [gcalTimedEvents.gcalEvents.recurring.id!, new ObjectId()],
      ]);

      const gcalEvents = [
        gcalAllDayEvents.gcalEvents.regular,
        gcalTimedEvents.gcalEvents.regular,
        gcalAllDayEvents.gcalEvents.recurring,
        gcalTimedEvents.gcalEvents.recurring,
        ...gcalAllDayEvents.gcalEvents.instances,
        ...gcalTimedEvents.gcalEvents.instances,
      ];

      return [
        somedayEvent,
        ...gcalEvents.map((gcalEvent) => {
          const event = {
            _id: recurringEventIds.get(gcalEvent.id) ?? new ObjectId(),
            user: user._id.toString(),
            gEventId: gcalEvent.id,
            title: gcalEvent.summary || "No Title",
            startDate: gcalEvent.start?.dateTime ?? gcalEvent.start!.date!,
            endDate: gcalEvent.end?.dateTime ?? gcalEvent.end!.date!,
            order: faker.number.int({ min: 0, max: 10 }),
            isAllDay: !!gcalEvent.start?.date,
            isSomeday: false,
            origin: Origin.GOOGLE,
            priority: Priorities.UNASSIGNED,
          };

          if (gcalEvent.description) {
            Object.assign(event, { description: gcalEvent.description });
          }

          if (gcalEvent.recurrence) {
            Object.assign(event, {
              recurrence: { rule: gcalEvent.recurrence },
            });
          }

          if (gcalEvent.recurringEventId) {
            Object.assign(event, {
              gRecurringEventId: gcalEvent.recurringEventId,
              recurrence: {
                eventId: recurringEventIds
                  .get(gcalEvent.recurringEventId)
                  ?.toString(),
              },
            });
          }

          return V0EventSchema.parse(event);
        }),
      ];
    });

    const events = await collection.insertMany(data).then(() => data);

    return events;
  }

  static async getGCalEvent(
    user: ObjectId,
    gEventId: string,
    gCalendarId: string,
  ): Promise<gSchema$Event> {
    const gcal = await getGcalClient(user);
    const gEvent = await gcalService.getEvent(gcal, gEventId, gCalendarId);

    return gEvent;
  }

  static async createSeries(
    baseOverrides: Partial<Schema_Base_Event>,
    instanceOverrides?: Partial<Schema_Instance_Event>,
  ) {
    const { base, instances } = createRecurrenceSeries(
      baseOverrides,
      instanceOverrides,
    );

    const meta = await mongoService.event.insertMany([base, ...instances]);

    return {
      state: { baseEvent: base, instances },
      meta,
    };
  }
}
