import { Logger } from "@core/logger/winston.logger";
import calendarService from "@backend/calendar/services/calendar.service";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { eventRepository } from "@backend/event/event.repository";
import { mapEventRecordToGoogle } from "@backend/event/google-event.adapter";
import { isWritableToGoogle } from "@backend/sync/services/event-propagation/compass-to-google/compass-to-google.event-propagation";

const logger = Logger("app:compass-to-google-backfill");

/**
 * Reconnect backfill (B9/A34): candidates are events whose owning calendar
 * is Google-sourced and that have never been synced to Google
 * (`externalReference === null`). Pushes each through the same write path
 * as normal Compass->Google propagation and persists the resulting
 * `externalReference` on success.
 */
export const syncCompassEventsToGoogle = async (
  userId: string,
): Promise<number> => {
  const calendars = await calendarService.list(userId);
  const googleCalendars = calendars.filter(
    (c) => c.source.provider === "google" && c.isActive,
  );

  if (googleCalendars.length === 0) return 0;

  const calendarById = new Map(
    googleCalendars.map((c) => [c._id.toHexString(), c]),
  );

  const candidates = await mongoService.event
    .find({
      calendarId: { $in: googleCalendars.map((c) => c._id) },
      externalReference: null,
    })
    .toArray();

  if (candidates.length === 0) return 0;

  const context = await createGoogleRequestContext(userId);
  let syncedCount = 0;

  for (const record of candidates) {
    if (!isWritableToGoogle(record)) continue;
    // Series occurrences with no externalReference are a Compass-local read
    // model (packet 05 step 4): the per-instance events.instances
    // resolution that a real scope "this" edit/delete uses lives in
    // CompassToGoogleEventPropagation, not here. Backfill only ever
    // events.insert's a record, and doing that for an occurrence would
    // create a duplicate, unlinked Google event instead of relying on
    // Google's own RRULE expansion off the (already- or not-yet-synced)
    // series base.
    if (record.recurrence.kind === "occurrence") continue;

    const calendar = calendarById.get(record.calendarId.toHexString());
    if (!calendar || calendar.source.provider !== "google") continue;

    try {
      const body = mapEventRecordToGoogle(record);
      const created = await gcalService.createEvent(
        context,
        calendar.source.calendarId,
        body,
      );

      if (!created.id) continue;

      await eventRepository.replaceOne({
        ...record,
        externalReference: {
          provider: "google",
          eventId: created.id,
          recurringEventId: created.recurringEventId ?? null,
        },
      });

      syncedCount += 1;
    } catch (err) {
      logger.error(
        `Failed to backfill event ${record._id.toHexString()} to Google for user ${userId}`,
        err,
      );
    }
  }

  return syncedCount;
};

const compassToGoogleBackfill = {
  syncCompassEventsToGoogle,
};

export default compassToGoogleBackfill;
