import { type ClientSession, type ObjectId } from "mongodb";
import { type gSchema$Event } from "@core/types/gcal";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { eventRepository } from "@backend/event/event.repository";
import { mapGoogleEvent } from "@backend/event/google-event.adapter";

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

    let result = emptyResult();
    for (const event of events) {
      result = merge(
        result,
        await this.applyOne(event, seriesMap, perPage, session, true),
      );
    }
    return result;
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

    for (const gRecurringEventId of gRecurringEventIds) {
      const existing = await eventRepository.findByExternalReference(
        this.calendar._id,
        gRecurringEventId,
        session,
      );
      if (existing) seriesMap.set(gRecurringEventId, existing._id);
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
      const { deletedCount, deletedIds } =
        await eventRepository.deleteByExternalReference(
          this.calendar._id,
          mapped.providerEventId,
          session,
        );
      return {
        processed: 1,
        saved: 0,
        deleted: deletedCount,
        ignored: 0,
        invalid: 0,
        affectedEventIds: deletedIds.map((id) => id.toHexString()),
      };
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

    const record = existing
      ? { ...mapped.event, _id: existing._id, createdAt: existing.createdAt }
      : mapped.event;

    if (existing) {
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
      const instances = await this.fetchInstances(event.id, perPage);
      for (const instance of instances) {
        result = merge(
          result,
          await this.applyOne(instance, seriesMap, perPage, session, false),
        );
      }
    }

    return result;
  }

  private async fetchInstances(
    gEventId: string,
    perPage: number,
  ): Promise<gSchema$Event[]> {
    const instances: gSchema$Event[] = [];
    const response = gcalService.getBaseRecurringEventInstances({
      context: this.context,
      calendarId: this.gCalendarId,
      eventId: gEventId,
      maxResults: perPage,
    });

    for await (const { items = [] } of response) {
      instances.push(...items);
    }

    return instances;
  }
}
