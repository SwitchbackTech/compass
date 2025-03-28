import { Schema_Event } from "@core/types/event.types";
import { gCalendar } from "@core/types/gcal";
import { RecurringEventProvider } from "../recur.provider.interface";

/**
 * Google Calendar specific implementation for handling recurring events
 */
export class GCalRecurringEventProvider implements RecurringEventProvider {
  constructor(private gcal: gCalendar) {}

  async createSeries(event: Schema_Event): Promise<{ insertedId: string }> {
    const googleEvent = await this.gcal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: event.description || undefined,
        start: {
          dateTime: event.startDate,
        },
        end: {
          dateTime: event.endDate,
        },
        recurrence: event.recurrence?.rule,
      },
    });

    return { insertedId: googleEvent.data.id || "" };
  }

  async deleteAllInstances(
    baseEventId: string,
  ): Promise<{ deletedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEventId,
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.delete({
          calendarId: "primary",
          eventId: instance.id || "",
        }),
      ) || [],
    );

    return { deletedCount: instances.data.items?.length || 0 };
  }

  async deleteFutureInstances(
    baseEventId: string,
    fromDate: string,
  ): Promise<{ deletedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEventId,
      timeMin: fromDate,
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.delete({
          calendarId: "primary",
          eventId: instance.id || "",
        }),
      ) || [],
    );

    return { deletedCount: instances.data.items?.length || 0 };
  }

  async deleteInstance(gEventId: string): Promise<{ deletedCount: number }> {
    await this.gcal.events.delete({
      calendarId: "primary",
      eventId: gEventId,
    });

    return { deletedCount: 1 };
  }

  async deleteInstances(baseId: string): Promise<{ deletedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseId,
    });

    await Promise.all(
      instances.data.items
        ?.filter((instance) => instance.id !== baseId)
        .map((instance) =>
          this.gcal.events.delete({
            calendarId: "primary",
            eventId: instance.id || "",
          }),
        ) || [],
    );

    return { deletedCount: instances.data.items?.length || 0 };
  }

  async deleteInstancesFromDate(
    baseEvent: Schema_Event,
    fromDate: string,
  ): Promise<{ deletedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEvent.recurrence?.eventId || "",
      timeMin: fromDate,
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.delete({
          calendarId: "primary",
          eventId: instance.id || "",
        }),
      ) || [],
    );

    return { deletedCount: instances.data.items?.length || 0 };
  }

  async deleteSeries(
    baseEvent: Schema_Event,
  ): Promise<{ deletedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEvent.recurrence?.eventId || "",
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.delete({
          calendarId: "primary",
          eventId: instance.id || "",
        }),
      ) || [],
    );

    return { deletedCount: instances.data.items?.length || 0 };
  }

  async deleteSingleInstance(
    instance: Schema_Event,
  ): Promise<{ deletedCount: number }> {
    await this.gcal.events.delete({
      calendarId: "primary",
      eventId: instance.gEventId || "",
    });

    return { deletedCount: 1 };
  }

  async expandRecurringEvent(baseEvent: Schema_Event): Promise<Schema_Event[]> {
    // Get the event from Google Calendar
    const event = await this.gcal.events.get({
      calendarId: "primary",
      eventId: baseEvent.gEventId,
    });

    if (!event.data.recurrence) {
      return [baseEvent];
    }

    // Get all instances of the recurring event
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEvent.gEventId,
    });

    // Convert Google Calendar events to our schema
    return (
      instances.data.items?.map((instance) => ({
        ...baseEvent,
        gEventId: instance.id || undefined,
        startDate:
          instance.start?.dateTime || instance.start?.date || undefined,
        endDate: instance.end?.dateTime || instance.end?.date || undefined,
        recurrence: {
          eventId: baseEvent.gEventId,
          rule: baseEvent.recurrence?.rule || [],
        },
      })) || []
    );
  }

  async insertBaseEvent(event: Schema_Event): Promise<{ insertedId: string }> {
    const googleEvent = await this.gcal.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: event.title,
        description: event.description || undefined,
        start: {
          dateTime: event.startDate,
        },
        end: {
          dateTime: event.endDate,
        },
        recurrence: event.recurrence?.rule,
      },
    });

    return { insertedId: googleEvent.data.id || "" };
  }

  async insertEventInstances(
    instances: Schema_Event[],
  ): Promise<{ insertedIds: string[] }> {
    const insertedIds = await Promise.all(
      instances.map(async (instance) => {
        const googleEvent = await this.gcal.events.insert({
          calendarId: "primary",
          requestBody: {
            summary: instance.title,
            description: instance.description || undefined,
            start: {
              dateTime: instance.startDate,
            },
            end: {
              dateTime: instance.endDate,
            },
            recurrence: instance.recurrence?.rule,
          },
        });
        return googleEvent.data.id || "";
      }),
    );

    return { insertedIds };
  }

  async updateBaseEventRecurrence(recurrence: {
    rule: string[];
    eventId: string;
  }): Promise<{ matchedCount: number }> {
    await this.gcal.events.patch({
      calendarId: "primary",
      eventId: recurrence.eventId,
      requestBody: {
        recurrence: recurrence.rule,
      },
    });

    return { matchedCount: 1 };
  }

  async updateInstance(
    instance: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    await this.gcal.events.patch({
      calendarId: "primary",
      eventId: instance.gEventId || "",
      requestBody: {
        summary: instance.title,
        description: instance.description || undefined,
        start: {
          dateTime: instance.startDate,
        },
        end: {
          dateTime: instance.endDate,
        },
      },
    });

    return { matchedCount: 1 };
  }

  async updateFutureInstances(
    event: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    const baseId = event.recurrence?.eventId;
    if (!baseId) {
      throw new Error("No base event id");
    }

    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseId,
      timeMin: event.startDate,
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.patch({
          calendarId: "primary",
          eventId: instance.id || "",
          requestBody: {
            summary: event.title,
            description: event.description || undefined,
            start: {
              dateTime: instance.start?.dateTime,
            },
            end: {
              dateTime: instance.end?.dateTime,
            },
          },
        }),
      ) || [],
    );

    return { matchedCount: instances.data.items?.length || 0 };
  }

  async updateSeriesWithSplit(
    originalBase: Schema_Event,
    newBase: Schema_Event,
    modifiedInstance: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    // First update the original base event
    await this.updateBaseEventRecurrence({
      rule: originalBase.recurrence?.rule || [],
      eventId: originalBase.recurrence?.eventId || "",
    });

    // Then insert the new base event
    await this.insertBaseEvent(newBase);

    // Finally update the modified instance
    await this.updateInstance(modifiedInstance);

    return { matchedCount: 3 };
  }

  async updateEntireSeries(
    originalBase: Schema_Event,
    updatedBase: Schema_Event,
  ): Promise<{ matchedCount: number }> {
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: originalBase.recurrence?.eventId || "",
    });

    await Promise.all(
      instances.data.items?.map((instance) =>
        this.gcal.events.patch({
          calendarId: "primary",
          eventId: instance.id || "",
          requestBody: {
            summary: updatedBase.title,
            description: updatedBase.description || undefined,
            start: {
              dateTime: instance.start?.dateTime,
            },
            end: {
              dateTime: instance.end?.dateTime,
            },
            recurrence: updatedBase.recurrence?.rule,
          },
        }),
      ) || [],
    );

    return { matchedCount: instances.data.items?.length || 0 };
  }
}
