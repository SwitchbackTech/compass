import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";
import { mapEventRecordToGoogle } from "@backend/event/google-event.adapter";
import { getGcalClient } from "@backend/sync/services/google-sync/gcal.client";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";

const logger = Logger("app:compass-to-google.event-propagation");

export type EventChangeSet = {
  /** Records created or replaced in this mutation (post-materialization). */
  upserted: EventRecord[];
  /** Records as they existed immediately before being deleted. */
  deletedBefore: EventRecord[];
};

export const isWritableToGoogle = (record: EventRecord): boolean =>
  record.content.kind === "details" &&
  record.schedule.kind !== "someday" &&
  // Materialized series instances (B6) are a Compass-local read model:
  // Google expands its own copy of an occurrence from the base event's
  // RRULE, so pushing each instance through events.insert/patch would
  // create duplicate, unlinked Google events instead of relying on
  // Google's own recurrence expansion. Only the series base (and
  // standalone/single events) carry a syncable identity of their own.
  record.recurrence.kind !== "occurrence";

/**
 * Propagates a Compass mutation to the OWNING calendar's Google copy (B7,
 * F). Google effects run strictly after the Mongo transaction that produced
 * `change` has committed: the caller awaits the transaction first, then
 * calls this. Google writes never run inside an open transaction — they
 * would repeat on a transient-write-conflict retry, and awaiting network
 * I/O inside an open transaction is what made write conflicts likely to
 * begin with.
 */
export class CompassToGoogleEventPropagation {
  static async propagate(
    userId: string,
    change: EventChangeSet,
  ): Promise<void> {
    const calendarIds = [
      ...new Set(
        [...change.upserted, ...change.deletedBefore].map((event) =>
          event.calendarId.toHexString(),
        ),
      ),
    ];

    if (calendarIds.length === 0) return;

    const calendars = await mongoService.calendar
      .find({ _id: { $in: calendarIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const calendarById = new Map(
      calendars.map((c) => [c._id.toHexString(), c]),
    );

    try {
      for (const record of change.deletedBefore) {
        await CompassToGoogleEventPropagation.propagateDelete(
          userId,
          record,
          calendarById.get(record.calendarId.toHexString()),
        );
      }

      for (const record of change.upserted) {
        await CompassToGoogleEventPropagation.propagateUpsert(
          userId,
          record,
          calendarById.get(record.calendarId.toHexString()),
        );
      }
    } catch (err) {
      if (isMissingGoogleRefreshToken(err)) {
        logger.info(
          `Skipping Google effect for user ${userId} because Google is not connected.`,
        );
        return;
      }

      logger.error("Compass->Google propagation failed", err as Error);
      throw eventMutationError(
        "PROVIDER_FAILURE",
        "Failed to sync the change to Google Calendar",
      );
    }
  }

  private static async propagateDelete(
    userId: string,
    record: EventRecord,
    calendar: CalendarRecord | undefined,
  ): Promise<void> {
    if (!calendar || calendar.source.provider !== "google") return;
    if (!record.externalReference) return;

    const gcal = await getGcalClient(userId);
    await gcalService.deleteEvent(
      gcal,
      calendar.source.calendarId,
      record.externalReference.eventId,
    );
  }

  private static async propagateUpsert(
    userId: string,
    record: EventRecord,
    calendar: CalendarRecord | undefined,
  ): Promise<void> {
    if (!calendar || calendar.source.provider !== "google") return;
    if (!isWritableToGoogle(record)) return;

    const gcal = await getGcalClient(userId);
    const body = mapEventRecordToGoogle(record);

    if (record.externalReference) {
      await gcalService.patchEvent(
        gcal,
        calendar.source.calendarId,
        record.externalReference.eventId,
        body,
      );
      return;
    }

    const created = await gcalService.createEvent(
      gcal,
      calendar.source.calendarId,
      body,
    );

    if (created.id) {
      await eventRepository.replaceOne({
        ...record,
        externalReference: {
          provider: "google",
          eventId: created.id,
          recurringEventId: created.recurringEventId ?? null,
        },
      });
    }
  }
}
