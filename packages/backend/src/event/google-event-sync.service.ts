import { type ClientSession, type ObjectId } from "mongodb";
import { type gSchema$Event } from "@core/types/gcal";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { type EventRecord } from "@backend/event/event.record";
import { eventRepository } from "@backend/event/event.repository";
import { mapGoogleEvent } from "@backend/event/google-event.adapter";
import { getAnchorDate } from "@backend/event/services/recur/util/recur.util";

/**
 * The instant Google considers this event's fixed position in a recurrence
 * pattern (stays fixed even after the instance's own start/end are edited).
 * Present on both live instances and cancellation notifications, so it is
 * the shared key for matching a webhook-delivered instance/cancellation
 * against a not-yet-linked local occurrence -- see `findUnlinkedOccurrence`.
 */
const getInstanceAnchor = (event: gSchema$Event): Date | null => {
  const original = event.originalStartTime;
  const value = original?.dateTime ?? original?.date;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export type GoogleEventSyncResult = {
  processed: number;
  saved: number;
  deleted: number;
  ignored: number;
  invalid: number;
  /** Compass event ids touched (created/updated/deleted) by this apply. */
  affectedEventIds: string[];
};

const emptyResult = (): GoogleEventSyncResult => ({
  processed: 0,
  saved: 0,
  deleted: 0,
  ignored: 0,
  invalid: 0,
  affectedEventIds: [],
});

const deleteResult = (deletedIds: ObjectId[]): GoogleEventSyncResult => ({
  ...emptyResult(),
  processed: 1,
  deleted: deletedIds.length,
  affectedEventIds: deletedIds.map((id) => id.toHexString()),
});

const merge = (
  a: GoogleEventSyncResult,
  b: GoogleEventSyncResult,
): GoogleEventSyncResult => ({
  processed: a.processed + b.processed,
  saved: a.saved + b.saved,
  deleted: a.deleted + b.deleted,
  ignored: a.ignored + b.ignored,
  invalid: a.invalid + b.invalid,
  affectedEventIds: [...a.affectedEventIds, ...b.affectedEventIds],
});

const isStandalone = (event: gSchema$Event): boolean =>
  event.status !== "cancelled" &&
  !event.recurringEventId &&
  (!event.recurrence || event.recurrence.length === 0);

type MappedOccurrence = {
  record: EventRecord;
  anchor: Date;
};

/**
 * Applies a batch of Google Calendar events onto the owning CalendarRecord's
 * events, per B8 (match strictly by (calendarId, externalReference.eventId),
 * never a bare provider id). Shared by full/incremental Google import
 * (SyncImport) and Google->Compass webhook propagation
 * (GoogleToCompassEventPropagation) so both speak identical mapping and
 * matching rules instead of maintaining two copies of the same logic (the
 * old FSM-based GcalEventParser this replaces).
 *
 * Recurring series (B6): a base event with rules is mapped and saved first,
 * then its current instances are fetched from Google and each is mapped
 * against the base's freshly-known Compass id (`resolveSeriesObjectId`) and
 * saved as a materialized occurrence. This naturally handles every
 * transition Google can report (standalone -> series, series -> standalone,
 * series split into a new base) because each transition is just a
 * provider-id upsert/delete against the matching pair, with no separate
 * state machine required.
 */
export class GoogleEventSync {
  private readonly gCalendarId: string;

  constructor(
    private readonly context: GoogleRequestContext,
    private readonly calendar: CalendarRecord,
  ) {
    if (calendar.source.provider !== "google") {
      throw new Error(
        "GoogleEventSync requires a Google-sourced CalendarRecord",
      );
    }
    this.gCalendarId = calendar.source.calendarId;
  }

  async apply(
    events: gSchema$Event[],
    perPage = 1000,
    session?: ClientSession,
  ): Promise<GoogleEventSyncResult> {
    const seriesMap = new Map<string, ObjectId>();
    await this.preloadSeriesMap(events, seriesMap, session);

    const standalone: gSchema$Event[] = [];
    const remaining: gSchema$Event[] = [];
    for (const event of events) {
      (isStandalone(event) ? standalone : remaining).push(event);
    }
    let result = await this.applyStandalone(standalone, session);

    for (const event of remaining) {
      result = merge(
        result,
        await this.applyOne(event, seriesMap, perPage, session, true),
      );
    }
    return result;
  }

  private async applyStandalone(
    events: gSchema$Event[],
    session?: ClientSession,
  ): Promise<GoogleEventSyncResult> {
    if (events.length === 0) return emptyResult();

    const records: EventRecord[] = [];
    let ignored = 0;
    let invalid = 0;
    const now = new Date();

    for (const event of events) {
      const mapped = mapGoogleEvent(event, {
        calendarId: this.calendar._id,
        calendarTimeZone: this.calendar.timeZone,
        resolveSeriesObjectId: () => undefined,
        now,
      });

      if (mapped.kind === "ignored") {
        ignored += 1;
      } else if (mapped.kind === "invalid") {
        invalid += 1;
      } else if (mapped.kind === "mapped") {
        records.push(mapped.event);
      }
    }

    const providerIds = records.flatMap((record) =>
      record.externalReference ? [record.externalReference.eventId] : [],
    );
    const existing = await eventRepository.findByExternalReferences(
      this.calendar._id,
      providerIds,
      session,
    );
    const existingByProviderId = new Map(
      existing.flatMap((record) =>
        record.externalReference
          ? [[record.externalReference.eventId, record] as const]
          : [],
      ),
    );
    const replacements = records.map((record) => {
      const providerId = record.externalReference?.eventId;
      const match = providerId
        ? existingByProviderId.get(providerId)
        : undefined;
      return match
        ? { ...record, _id: match._id, createdAt: match.createdAt }
        : record;
    });

    await eventRepository.bulkReplace(replacements, session);

    return {
      processed: events.length,
      saved: replacements.length,
      deleted: 0,
      ignored,
      invalid,
      affectedEventIds: replacements.map((record) => record._id.toHexString()),
    };
  }

  private async preloadSeriesMap(
    events: gSchema$Event[],
    seriesMap: Map<string, ObjectId>,
    session?: ClientSession,
  ): Promise<void> {
    const gRecurringEventIds = [
      ...new Set(
        events
          .map((event) => event.recurringEventId)
          .filter((id): id is string => !!id),
      ),
    ].filter((id) => !seriesMap.has(id));
    if (gRecurringEventIds.length === 0) return;

    const existingSeries = await eventRepository.findByExternalReferences(
      this.calendar._id,
      gRecurringEventIds,
      session,
    );
    for (const existing of existingSeries) {
      const providerId = existing.externalReference?.eventId;
      if (providerId) seriesMap.set(providerId, existing._id);
    }
  }

  private async applyOne(
    event: gSchema$Event,
    seriesMap: Map<string, ObjectId>,
    perPage: number,
    session: ClientSession | undefined,
    expandSeries: boolean,
  ): Promise<GoogleEventSyncResult> {
    const resolveSeriesObjectId = (gRecurringEventId: string) =>
      seriesMap.get(gRecurringEventId);

    const mapped = mapGoogleEvent(event, {
      calendarId: this.calendar._id,
      calendarTimeZone: this.calendar.timeZone,
      resolveSeriesObjectId,
      now: new Date(),
    });

    if (mapped.kind === "cancelled") {
      const { deletedIds } = await eventRepository.deleteByExternalReference(
        this.calendar._id,
        mapped.providerEventId,
        session,
      );
      if (deletedIds.length > 0) return deleteResult(deletedIds);

      // No externally-linked doc matched -- this can be the cancellation of
      // an instance a Compass-created series already materialized locally
      // but never synced to Google. Fall back to matching it by series +
      // original position, same as the insert-side convergence below.
      const seriesId = mapped.providerRecurringEventId
        ? seriesMap.get(mapped.providerRecurringEventId)
        : undefined;
      const anchor = getInstanceAnchor(event);
      const unlinked =
        seriesId && anchor
          ? await eventRepository.findUnlinkedOccurrence(
              seriesId,
              anchor,
              session,
            )
          : null;

      if (!unlinked) return deleteResult([]);

      await eventRepository.deleteMany([unlinked._id], session);
      return deleteResult([unlinked._id]);
    }

    if (mapped.kind === "ignored") {
      return { ...emptyResult(), processed: 1, ignored: 1 };
    }

    if (mapped.kind === "invalid") {
      return { ...emptyResult(), processed: 1, invalid: 1 };
    }

    const existing = await eventRepository.findByExternalReference(
      this.calendar._id,
      mapped.event.externalReference!.eventId,
      session,
    );

    // An occurrence that isn't linked by external id yet may still already
    // exist locally: a Compass-created series materializes every occurrence
    // (including the first) before any of them have ever synced to Google.
    // Match it by series + original position so this echo adopts the local
    // doc instead of inserting a duplicate alongside it.
    const unlinkedMatch =
      !existing && mapped.event.recurrence.kind === "occurrence"
        ? await eventRepository.findUnlinkedOccurrence(
            mapped.event.recurrence.seriesId,
            getInstanceAnchor(event) ?? getAnchorDate(mapped.event.schedule),
            session,
          )
        : null;

    const matched = existing ?? unlinkedMatch;

    const record = matched
      ? { ...mapped.event, _id: matched._id, createdAt: matched.createdAt }
      : mapped.event;

    if (matched) {
      await eventRepository.replaceOne(record, session);
    } else {
      await eventRepository.insertOne(record, session);
    }

    let result: GoogleEventSyncResult = {
      processed: 1,
      saved: 1,
      deleted: 0,
      ignored: 0,
      invalid: 0,
      affectedEventIds: [record._id.toHexString()],
    };

    if (expandSeries && record.recurrence.kind === "series" && event.id) {
      seriesMap.set(event.id, record._id);
      result = merge(
        result,
        await this.applyInstances(event.id, seriesMap, perPage, session),
      );
    }

    return result;
  }

  private async applyInstances(
    gEventId: string,
    seriesMap: Map<string, ObjectId>,
    perPage: number,
    session?: ClientSession,
  ): Promise<GoogleEventSyncResult> {
    let result = emptyResult();
    const response = gcalService.getBaseRecurringEventInstances({
      context: this.context,
      calendarId: this.gCalendarId,
      eventId: gEventId,
      maxResults: perPage,
    });

    for await (const { items = [] } of response) {
      result = merge(
        result,
        await this.applyInstancePage(items, seriesMap, perPage, session),
      );
    }

    return result;
  }

  private async applyInstancePage(
    events: gSchema$Event[],
    seriesMap: Map<string, ObjectId>,
    perPage: number,
    session?: ClientSession,
  ): Promise<GoogleEventSyncResult> {
    const occurrences: MappedOccurrence[] = [];
    let result = emptyResult();
    const now = new Date();

    for (const event of events) {
      const mapped = mapGoogleEvent(event, {
        calendarId: this.calendar._id,
        calendarTimeZone: this.calendar.timeZone,
        resolveSeriesObjectId: (id) => seriesMap.get(id),
        now,
      });

      if (mapped.kind === "ignored") {
        result.processed += 1;
        result.ignored += 1;
      } else if (mapped.kind === "invalid") {
        result.processed += 1;
        result.invalid += 1;
      } else if (
        mapped.kind === "mapped" &&
        mapped.event.recurrence.kind === "occurrence"
      ) {
        occurrences.push({
          record: mapped.event,
          anchor:
            getInstanceAnchor(event) ?? getAnchorDate(mapped.event.schedule),
        });
      } else {
        result = merge(
          result,
          await this.applyOne(event, seriesMap, perPage, session, false),
        );
      }
    }

    return merge(result, await this.replaceOccurrences(occurrences, session));
  }

  private async replaceOccurrences(
    occurrences: MappedOccurrence[],
    session?: ClientSession,
  ): Promise<GoogleEventSyncResult> {
    if (occurrences.length === 0) return emptyResult();

    const providerIds = occurrences.map(
      ({ record }) => record.externalReference!.eventId,
    );
    const existing = await eventRepository.findByExternalReferences(
      this.calendar._id,
      providerIds,
      session,
    );
    const existingByProviderId = new Map(
      existing.map((record) => [record.externalReference!.eventId, record]),
    );

    const unmatched = occurrences.filter(
      ({ record }) =>
        !existingByProviderId.has(record.externalReference!.eventId),
    );
    const seriesId = occurrences[0]!.record.recurrence;
    const unlinked =
      seriesId.kind === "occurrence"
        ? await eventRepository.findUnlinkedOccurrences(
            seriesId.seriesId,
            unmatched.map(({ anchor }) => anchor),
            session,
          )
        : [];
    const unlinkedByAnchor = new Map(
      unlinked.map((record) => [
        getAnchorDate(record.schedule).toISOString(),
        record,
      ]),
    );

    const replacements = occurrences.map(({ record, anchor }) => {
      const providerId = record.externalReference!.eventId;
      const match =
        existingByProviderId.get(providerId) ??
        unlinkedByAnchor.get(anchor.toISOString());
      return match
        ? { ...record, _id: match._id, createdAt: match.createdAt }
        : record;
    });
    await eventRepository.bulkReplace(replacements, session);

    return {
      processed: occurrences.length,
      saved: replacements.length,
      deleted: 0,
      ignored: 0,
      invalid: 0,
      affectedEventIds: replacements.map((record) => record._id.toHexString()),
    };
  }
}
