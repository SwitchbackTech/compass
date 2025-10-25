import { ObjectId } from "bson";
import {
  EventSchema,
  InstanceEventMetadataSchema,
  Schema_Event,
} from "@core/types/event.types";
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

    const { _id, metadata, recurrence } = event;
    const startDate = dayjs(event.startDate);
    const allDay = isAllDay(event);
    const hasProviderBase = metadata && "recurringEventId" in metadata;
    const hasBase = recurrence && "eventId" in recurrence;

    if (isInstance(event) && hasProviderBase && hasBase) {
      return InstanceEventMetadataSchema.parse({
        id: metadata?.id ?? `${_id}_${startDate.toRRuleDTSTARTString(allDay)}`,
        recurringEventId:
          metadata.recurringEventId ??
          baseProviderId ??
          recurrence.eventId.toString(),
      });
    }

    return { id: metadata?.id ?? new ObjectId().toString() };
  }
}
