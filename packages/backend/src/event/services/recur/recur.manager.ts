//@ts-nocheck
import { Origin } from "@core/constants/core.constants";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { determineNextAction } from "./parse/recur.gcal.parse";

//@ts-expect-error will implement this shortly
interface EventState {
  isRecurring: boolean; // derived from recurrence?.rule
  isBaseEvent: boolean; // derived from recurrence?.eventId
  isModifiedInstance: boolean; // derived from originalStartDate
  seriesId: string; // derived from recurrence?.eventId
}

export class RecurringEventManager {
  // CREATE: New recurring event
  async handleCreateSeries(event: gSchema$Event) {
    // Create base event
    const baseEvent: Schema_Event = {
      gEventId: event.id,
      title: event.summary,
      startDate: event.start.dateTime,
      endDate: event.end.dateTime,
      recurrence: {
        rule: event.recurrence,
        eventId: event.id,
      },
      origin: Origin.GOOGLE_IMPORT,
      user: userId,
    };

    await db.event.insertOne(baseEvent);

    // Expand and store instances
    const instances = await this.expandRecurringEvent(event);
    await db.event.insertMany(instances);
  }

  // UPDATE: This event only
  async handleSingleInstanceUpdate(instance: gSchema$Event) {
    await db.event.updateOne(
      { gEventId: instance.id },
      {
        $set: {
          title: instance.summary,
          startDate: instance.start.dateTime,
          endDate: instance.end.dateTime,
          originalStartDate: instance.originalStartTime?.dateTime,
          updatedAt: instance.updated,
        },
      },
    );
  }

  // UPDATE: This and future events
  async handleThisAndFutureUpdate(
    originalBase: gSchema$Event,
    newBase: gSchema$Event,
    modifiedInstance: gSchema$Event,
  ) {
    // 1. Update original base event with UNTIL rule
    await db.event.updateOne(
      { gEventId: originalBase.id },
      {
        $set: {
          recurrence: {
            rule: originalBase.recurrence.map((rule) =>
              rule.includes("UNTIL")
                ? rule
                : `${rule};UNTIL=${modifiedInstance.start.dateTime}`,
            ),
            eventId: originalBase.id,
          },
        },
      },
    );

    // 2. Create new base event
    const newBaseEvent: Schema_Event = {
      gEventId: newBase.id,
      title: newBase.summary,
      startDate: newBase.start.dateTime,
      endDate: newBase.end.dateTime,
      recurrence: {
        rule: newBase.recurrence,
        eventId: newBase.id,
      },
      origin: Origin.GOOGLE_IMPORT,
      user: userId,
    };
    await db.event.insertOne(newBaseEvent);

    // 3. Delete future instances from original series
    await db.event.deleteMany({
      "recurrence.eventId": originalBase.id,
      startDate: { $gte: modifiedInstance.start.dateTime },
    });

    // 4. Create new instances for new series
    const newInstances = await this.expandRecurringEvent(newBase);
    await db.event.insertMany(newInstances);
  }

  // UPDATE: All events
  async handleAllEventsUpdate(
    originalBase: gSchema$Event,
    newBase: gSchema$Event,
  ) {
    // 1. Delete all instances of original series
    await db.event.deleteMany({
      "recurrence.eventId": originalBase.id,
    });

    // 2. Create new base event
    const newBaseEvent: Schema_Event = {
      gEventId: newBase.id,
      title: newBase.summary,
      startDate: newBase.start.dateTime,
      endDate: newBase.end.dateTime,
      recurrence: {
        rule: newBase.recurrence,
        eventId: newBase.id,
      },
      origin: Origin.GOOGLE_IMPORT,
      user: userId,
    };
    await db.event.insertOne(newBaseEvent);

    // 3. Create new instances
    const newInstances = await this.expandRecurringEvent(newBase);
    await db.event.insertMany(newInstances);
  }

  // DELETE: This event only
  async handleSingleInstanceDelete(instance: gSchema$Event) {
    await db.event.deleteOne({ gEventId: instance.id });
  }

  // DELETE: This and future events
  async handleThisAndFutureDelete(
    baseEvent: gSchema$Event,
    deleteFromDate: string,
  ) {
    // 1. Update base event with UNTIL rule
    await db.event.updateOne(
      { gEventId: baseEvent.id },
      {
        $set: {
          recurrence: {
            rule: baseEvent.recurrence.map((rule) =>
              rule.includes("UNTIL") ? rule : `${rule};UNTIL=${deleteFromDate}`,
            ),
            eventId: baseEvent.id,
          },
        },
      },
    );

    // 2. Delete future instances
    await db.event.deleteMany({
      "recurrence.eventId": baseEvent.id,
      startDate: { $gte: deleteFromDate },
    });
  }

  // DELETE: All events
  async handleAllEventsDelete(baseEvent: gSchema$Event) {
    await db.event.deleteMany({
      "recurrence.eventId": baseEvent.id,
    });
  }

  // Helper to expand recurring events
  private async expandRecurringEvent(
    baseEvent: gSchema$Event,
  ): Promise<Schema_Event[]> {
    const timeMin = new Date().toISOString();
    const timeMax = dayjs().add(6, "months").toISOString();

    const { data } = await gcalService.getEventInstances(
      this.gcal,
      calendarId,
      baseEvent.id,
      timeMin,
      timeMax,
    );

    return data.items.map((instance) => ({
      gEventId: instance.id,
      title: instance.summary,
      startDate: instance.start.dateTime,
      endDate: instance.end.dateTime,
      recurrence: {
        eventId: baseEvent.id,
      },
      origin: Origin.GOOGLE_IMPORT,
      user: userId,
    }));
  }
}
