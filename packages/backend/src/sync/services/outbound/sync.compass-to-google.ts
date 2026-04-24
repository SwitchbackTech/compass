import { type Filter } from "mongodb";
import { MapEvent } from "@core/mappers/map.event";
import {
  type Schema_Event,
  type Schema_Event_Core,
} from "@core/types/event.types";
import mongoService from "@backend/common/services/mongo.service";
import { _createGcal } from "@backend/event/services/event.service";

export const syncCompassEventsToGoogle = async (
  userId: string,
): Promise<number> => {
  const compassEvents = await mongoService.event
    .find({
      user: userId,
      isSomeday: false,
      "recurrence.eventId": { $exists: false },
      $or: [
        // no gEventId means it has not been synced to Google yet
        { gEventId: { $exists: false } },
        { gEventId: null },
        { gEventId: "" },
      ],
    } as Filter<Omit<Schema_Event, "_id">>)
    .sort({ startDate: 1 })
    .toArray();

  let syncedCount = 0;

  for (const compassEvent of compassEvents) {
    if (
      !compassEvent.startDate ||
      !compassEvent.endDate ||
      !compassEvent.user
    ) {
      continue;
    }

    const gEvent = await _createGcal(
      userId,
      compassEvent as unknown as Schema_Event_Core,
    );
    const gEventId = gEvent.id;

    if (!gEventId) {
      continue;
    }

    await mongoService.event.updateOne(
      { _id: compassEvent._id, user: userId },
      { $set: { gEventId } },
    );

    syncedCount += 1;

    if (!compassEvent.recurrence?.rule) {
      continue;
    }

    const instances = await mongoService.event
      .find({
        user: userId,
        "recurrence.eventId": compassEvent._id.toString(),
      })
      .sort({ startDate: 1 })
      .toArray();

    for (const instance of instances) {
      const providerData = MapEvent.toGcalInstanceProviderData(
        {
          ...instance,
          _id: instance._id.toString(),
        } as Parameters<typeof MapEvent.toGcalInstanceProviderData>[0],
        {
          ...compassEvent,
          _id: compassEvent._id.toString(),
          gEventId,
        } as Parameters<typeof MapEvent.toGcalInstanceProviderData>[1],
      );

      await mongoService.event.updateOne(
        { _id: instance._id, user: userId },
        { $set: providerData },
      );
    }
  }

  return syncedCount;
};
