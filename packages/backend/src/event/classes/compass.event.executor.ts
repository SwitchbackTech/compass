import { type ClientSession, type ObjectId } from "mongodb";
import { type MaterializedMutation } from "@backend/event/classes/compass.event.generator";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";

export async function executeMutation(
  mutation: MaterializedMutation,
  session?: ClientSession,
): Promise<EventRecord> {
  if (mutation.deleteIds.length > 0) {
    await eventRepository.deleteMany(mutation.deleteIds, session);
  }
  if (mutation.upsert.length > 0) {
    await eventRepository.bulkReplace(mutation.upsert, session);
  }
  return mutation.primary;
}

export async function executeDelete(
  materialized: {
    deleteIds: ObjectId[];
    upsert: EventRecord[];
    deleteSeriesId: ObjectId | null;
  },
  session?: ClientSession,
): Promise<void> {
  if (materialized.deleteSeriesId) {
    await eventRepository.deleteBySeriesId(
      materialized.deleteSeriesId,
      session,
    );
    return;
  }
  if (materialized.deleteIds.length > 0) {
    await eventRepository.deleteMany(materialized.deleteIds, session);
  }
  if (materialized.upsert.length > 0) {
    await eventRepository.bulkReplace(materialized.upsert, session);
  }
}
