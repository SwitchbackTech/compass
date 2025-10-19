import { ObjectId } from "mongodb";
import { z } from "zod/v4";
import Migration from "@scripts/migrations/2025.10.18T20.01.14.migrate-events-to-new-events-collection";
import { Origin, Priorities } from "@core/constants/core.constants";
import { UserDriver } from "@backend/__tests__/drivers/user.driver";
import { mockGcalEvents } from "@backend/__tests__/mocks.gcal/factories/gcal.event.factory";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import calendarService from "@backend/calendar/services/calendar.service";
import mongoService from "@backend/common/services/mongo.service";

export class EventDriver {
  static async generateV0Data(count = 3) {
    const users = await UserDriver.createUsers(count);

    const collection = mongoService.db.collection<
      z.infer<typeof Migration.OldEventSchema>
    >(mongoService.event.collectionName);

    await Promise.all(
      users.map(async (user) =>
        calendarService.initializeGoogleCalendars(
          user._id,
          await getGcalClient(user._id.toString()),
        ),
      ),
    );

    const data = users.flatMap((user) => {
      const gcalAllDayEvents = mockGcalEvents(true, { count });
      const gcalTimedEvents = mockGcalEvents(false, { count });

      const somedayEvent = Migration.OldEventSchema.parse({
        user: user._id.toString(),
        title: "Someday Event",
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
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

          return Migration.OldEventSchema.parse(event);
        }),
      ];
    });

    const events = await collection.insertMany(data).then(() => data);

    return events;
  }
}
