import dayjs from "dayjs";
import { Origin } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  Schema_Event,
  Schema_Event_Core,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { RecurringEventProvider } from "../recur.provider.interface";

/**
 * Google Calendar specific implementation for handling recurring events
 */

//NOTE: These have not been tested and will
// fail. They are not being implemented currently
// but are just here to appease typescript and
// get it setup for follow up
export class GCalRecurringEventProvider implements RecurringEventProvider {
  constructor(private gcal: gCalendar) {}

  /**
   * Fetches all instances of a recurring event series and returns them as Compass events
   */
  private async expandRecurringEvent(
    userId: string,
    calendarId: string,
    recurringEventId: string,
  ): Promise<Schema_Event_Core[]> {
    const timeMin = new Date().toISOString();
    const timeMax = dayjs().add(6, "months").toISOString();

    const { data } = await this.gcal.events.instances({
      calendarId,
      eventId: recurringEventId,
      timeMin,
      timeMax,
    });
    const instances = data?.items;

    if (!instances) {
      throw error(
        EventError.NoGevents,
        "No instances found for recurring event",
      );
    }

    return MapEvent.toCompass(userId, instances, Origin.GOOGLE_IMPORT);
  }

  /**
   * Expands multiple recurring events into their instances
   */
  public async expandRecurringEvents(
    userId: string,
    calendarId: string,
    recurringEvents: gSchema$Event[],
  ): Promise<Schema_Event_Core[]> {
    const expandedEvents: Schema_Event_Core[] = [];

    for (const event of recurringEvents) {
      const recurringId = event.recurringEventId || event.id;
      if (!recurringId) {
        throw error(
          EventError.MissingProperty,
          "Recurring event not expanded due to missing recurrence id",
        );
      }
      const instances = await this.expandRecurringEvent(
        userId,
        calendarId,
        recurringId,
      );
      expandedEvents.push(...instances);
    }

    return expandedEvents;
  }

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

  async expandInstances(
    baseEvent: Schema_Event_Recur_Base,
  ): Promise<Schema_Event_Recur_Instance[]> {
    // Get the event from Google Calendar
    const event = await this.gcal.events.get({
      calendarId: "primary",
      eventId: baseEvent.gEventId || "",
    });

    if (!event.data.recurrence) {
      return [
        {
          ...baseEvent,
          recurrence: {
            eventId: baseEvent.gEventId || "",
          },
        },
      ];
    }

    // Get all instances of the recurring event
    const instances = await this.gcal.events.instances({
      calendarId: "primary",
      eventId: baseEvent.gEventId || "",
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
          eventId: baseEvent.gEventId || "",
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

  async updateBaseEventRecurrence(
    baseEventId: string,
    rule: string[],
  ): Promise<{ matchedCount: number }> {
    await this.gcal.events.patch({
      calendarId: "primary",
      eventId: baseEventId,
      requestBody: {
        recurrence: rule,
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
    modifiedInstance: Schema_Event,
  ): Promise<{ modifiedCount: number }> {
    // First update the original base event
    if (!originalBase.recurrence?.eventId) {
      throw error(
        EventError.MissingProperty,
        "Did not update series because no base event id",
      );
    }
    if (!originalBase.recurrence?.rule) {
      throw error(
        EventError.MissingProperty,
        "Did not update series because no recurrence rule",
      );
    }
    await this.updateBaseEventRecurrence(
      originalBase.recurrence?.eventId,
      originalBase.recurrence?.rule,
    );

    // Then insert the new base event
    // await this.insertBaseEvent(newBase);

    // Finally update the modified instance
    await this.updateInstance(modifiedInstance);

    return { modifiedCount: 3 };
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
