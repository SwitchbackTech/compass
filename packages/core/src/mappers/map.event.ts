import { ObjectId } from "bson";
import { z } from "zod/v4";
import {
  EventSchema,
  InstanceEventMetadataSchema,
  Schema_Event,
} from "@core/types/event.types";
import { StringV4Schema } from "@core/types/type.utils";
import dayjs from "@core/util/date/dayjs";
import { isAllDay, isInstance } from "@core/util/event/event.util";

export class MapEvent {
  static removeProviderMetadata(
    event: Schema_Event,
  ): Omit<Schema_Event, "metadata"> {
    return EventSchema.omit({ metadata: true }).parse(event);
  }

  static removeIdentifyingData(
    event: Schema_Event,
  ): Omit<Schema_Event, "_id" | "metadata" | "order" | "recurrence"> {
    return EventSchema.omit({
      _id: true,
      metadata: true,
      order: true,
      recurrence: true,
    }).parse(event);
  }

  static toProviderMetadata<T extends Schema_Event = Schema_Event>(
    event: T,
    baseProviderId?: string,
  ): T["metadata"] {
    if (event.isSomeday) return;

    const { metadata, recurrence } = event;
    const allDay = isAllDay(event);
    const hasProviderBase = metadata && "recurringEventId" in metadata;
    const metaBase = hasProviderBase ? metadata?.recurringEventId : undefined;
    const hasBase = recurrence && "eventId" in recurrence;
    const baseId = hasBase ? recurrence.eventId.toString() : undefined;
    const recurringEventId = baseProviderId ?? metaBase ?? baseId;
    const hasOriginalStart = "originalStartDate" in event;
    const start = hasOriginalStart ? event.originalStartDate : event.startDate;

    if (
      isInstance(event) &&
      StringV4Schema.safeParse(recurringEventId).success &&
      "originalStartDate" in event
    ) {
      const startDate = dayjs(z.date().parse(start));

      return InstanceEventMetadataSchema.parse({
        id:
          metadata?.id ??
          `${recurringEventId}_${startDate.toRRuleDTSTARTString(allDay)}`,
        recurringEventId,
      });
    }

    return { id: metadata?.id ?? new ObjectId().toString() };
  }
}
