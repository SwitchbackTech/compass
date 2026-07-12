import { ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { createGoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import { eventMutationError } from "@backend/event/event.error";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";
import { mapEventRecordToGoogle } from "@backend/event/google-event.adapter";
import { getAnchorDate } from "@backend/event/services/recur/util/recur.util";
import { isMissingGoogleRefreshToken } from "@backend/sync/services/google-sync/google-sync.errors";

const logger = Logger("app:compass-to-google.event-propagation");

export type EventChangeSet = {
  /** Records created or replaced in this mutation (post-materialization). */
  upserted: EventRecord[];
  /** Records as they existed immediately before being deleted. */
  deletedBefore: EventRecord[];
  /**
   * For an unresolved occurrence (externalReference: null) whose schedule
   * may have just been edited in this same call, the pre-edit start used to
   * search Google's events.instances by originalStartTime (packet 05 step
   * 4). Google's originalStartTime is the occurrence's fixed position in the
   * recurrence pattern -- it never moves even after the instance's own
   * start/end are edited -- so the lookup must use the position BEFORE this
   * edit, not the (possibly different) new time this same call is applying.
   * Keyed by the occurrence's _id hex string. An absent/missing entry falls
   * back to record.schedule.start (correct for a virgin, never-edited
   * occurrence, e.g. one freshly materialized by
   * materializeSeriesInstances, or a delete -- which has no "new" time to
   * confuse the anchor with).
   */
  originalStartByEventId?: Map<string, Date>;
};

export const isWritableToGoogle = (record: EventRecord): boolean =>
  record.content.kind === "details" && record.schedule.kind !== "someday";

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

    // A series base (recurrence.kind === "series") present in this same
    // upserted batch means a bulk (re)materialization is happening in this
    // call (a fresh series create, or a scope "all"/"thisAndFollowing"
    // regeneration/truncation) -- any occurrence records riding along in the
    // same batch are a Compass-local read model produced by that
    // regeneration, not an independent edit. Google will expand/truncate its
    // own copies from the base's RRULE (or the base's own patch/delete
    // below), so those occurrences must NOT go through the per-instance
    // events.instances resolution below -- doing so would either fan a
    // single series create out into N+1 unlinked Google events, or attempt
    // to resolve/delete an instance the base's own RRULE change already
    // handles.
    const regeneratingSeriesIds = new Set(
      change.upserted
        .filter((record) => record.recurrence.kind === "series")
        .map((record) => record._id.toHexString()),
    );

    try {
      for (const record of change.deletedBefore) {
        await CompassToGoogleEventPropagation.propagateDelete(
          userId,
          record,
          calendarById.get(record.calendarId.toHexString()),
          regeneratingSeriesIds,
        );
      }

      for (const record of change.upserted) {
        await CompassToGoogleEventPropagation.propagateUpsert(
          userId,
          record,
          calendarById.get(record.calendarId.toHexString()),
          change.originalStartByEventId,
          regeneratingSeriesIds,
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

  /**
   * Resolves the Google instance id for a not-yet-synced series occurrence
   * (packet 05 step 4). The series base is looked up fresh from Mongo rather
   * than passed in: by the time propagateDelete/propagateUpsert reaches an
   * occurrence, the base (if part of the same batch) has already been
   * processed, and if NOT part of the same batch (the common case: a lone
   * scope "this" edit/delete on an already-synced series) it is simply the
   * pre-existing base document. A6 keeps every series member on one
   * calendar, so scoping the lookup to the occurrence's own calendarId is
   * safe and avoids needing the caller's full owned-calendar list here.
   */
  private static async resolveSeriesBase(
    record: Extract<EventRecord["recurrence"], { kind: "occurrence" }>,
    calendarId: EventRecord["calendarId"],
  ): Promise<EventRecord | null> {
    const base = await eventRepository.findById(record.seriesId, [calendarId]);
    if (!base?.externalReference) return null;
    return base;
  }

  private static async propagateDelete(
    userId: string,
    record: EventRecord,
    calendar: CalendarRecord | undefined,
    regeneratingSeriesIds: Set<string>,
  ): Promise<void> {
    if (!calendar || calendar.source.provider !== "google") return;

    if (record.externalReference) {
      const context = await createGoogleRequestContext(userId);
      await gcalService.deleteEvent(
        context,
        calendar.source.calendarId,
        record.externalReference.eventId,
      );
      return;
    }

    if (record.recurrence.kind !== "occurrence") return;
    if (regeneratingSeriesIds.has(record.recurrence.seriesId.toHexString())) {
      return;
    }

    const base = await CompassToGoogleEventPropagation.resolveSeriesBase(
      record.recurrence,
      record.calendarId,
    );
    if (!base?.externalReference) return;

    const context = await createGoogleRequestContext(userId);
    const anchorStart = getAnchorDate(record.schedule);
    const instance = await gcalService.findEventInstance(
      context,
      calendar.source.calendarId,
      base.externalReference.eventId,
      anchorStart,
    );

    if (!instance?.id) {
      logger.warn(
        `propagateDelete: no Google instance of series ${base._id.toHexString()} matched occurrence ${record._id.toHexString()}'s original start (${anchorStart.toISOString()}); skipping Google delete for this occurrence.`,
      );
      return;
    }

    await gcalService.deleteEvent(
      context,
      calendar.source.calendarId,
      instance.id,
    );
  }

  private static async propagateUpsert(
    userId: string,
    record: EventRecord,
    calendar: CalendarRecord | undefined,
    originalStartByEventId: Map<string, Date> | undefined,
    regeneratingSeriesIds: Set<string>,
  ): Promise<void> {
    if (!calendar || calendar.source.provider !== "google") return;
    if (!isWritableToGoogle(record)) return;

    const context = await createGoogleRequestContext(userId);
    const body = mapEventRecordToGoogle(record);

    if (record.externalReference) {
      await gcalService.patchEvent(
        context,
        calendar.source.calendarId,
        record.externalReference.eventId,
        body,
      );
      return;
    }

    if (record.recurrence.kind === "occurrence") {
      if (regeneratingSeriesIds.has(record.recurrence.seriesId.toHexString())) {
        return;
      }

      const base = await CompassToGoogleEventPropagation.resolveSeriesBase(
        record.recurrence,
        record.calendarId,
      );
      if (!base?.externalReference) return;

      const anchorStart =
        originalStartByEventId?.get(record._id.toHexString()) ??
        getAnchorDate(record.schedule);

      const instance = await gcalService.findEventInstance(
        context,
        calendar.source.calendarId,
        base.externalReference.eventId,
        anchorStart,
      );

      if (!instance?.id) {
        logger.warn(
          `propagateUpsert: no Google instance of series ${base._id.toHexString()} matched occurrence ${record._id.toHexString()}'s original start (${anchorStart.toISOString()}); skipping Google sync for this edit.`,
        );
        return;
      }

      await gcalService.patchEvent(
        context,
        calendar.source.calendarId,
        instance.id,
        body,
      );

      await eventRepository.replaceOne({
        ...record,
        externalReference: {
          provider: "google",
          eventId: instance.id,
          recurringEventId: base.externalReference.eventId,
        },
      });
      return;
    }

    const created = await gcalService.createEvent(
      context,
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
