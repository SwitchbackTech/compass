import { type Filter, ObjectId, type WithId } from "mongodb";
import {
  type Schema_Event,
  type Schema_Event_Core,
} from "@core/types/event.types";
import { GenericError } from "@backend/common/errors/generic/generic.errors";
import { error } from "@backend/common/errors/handlers/error.handler";

export const getDeleteByIdFilter = (
  event: Schema_Event_Core,
): Filter<WithId<Omit<Schema_Event, "_id">>> => {
  if (!event._id) {
    throw error(
      GenericError.BadRequest,
      "Failed to get Delete Filter (missing id)",
    );
  }
  const _id = new ObjectId(event._id);
  const filter = { user: event.user };
  const isRecurring = event.recurrence?.rule;

  if (!isRecurring) {
    return { ...filter, _id };
  }

  if (!event.recurrence?.eventId) {
    throw error(
      GenericError.DeveloperError,
      "Failed to get Delete Filter (missing recurrence id)",
    );
  }

  const baseOrFutureInstance = {
    ...filter,
    $or: [
      { _id },
      {
        "recurrence.eventId": event.recurrence.eventId,
        startDate: { $gt: event.startDate },
        endDate: { $gt: event.endDate },
      },
    ],
  };

  return baseOrFutureInstance;
};
