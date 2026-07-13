import {
  type AnyBulkWriteOperation,
  type ClientSession,
  type Filter,
  ObjectId,
} from "mongodb";
import { type EventListQuery } from "@core/types/event-command.contracts";
import mongoService from "@backend/common/services/mongo.service";
import { type EventRecord } from "@backend/event/event.record";

/**
 * Single owner of Mongo access for the event collection (B2). Ownership is
 * always proven through the calendar: callers pass the set of calendarIds
 * the requesting user owns (resolved via the calendar collection), never a
 * bare user id and never a client-supplied provider id.
 */
class EventRepository {
  /**
   * Find one event, scoped to the given owned calendars.
   */
  async findById(
    eventId: string | ObjectId,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<EventRecord | null> {
    return mongoService.event.findOne(
      {
        _id: new ObjectId(eventId),
        calendarId: { $in: ownedCalendarIds },
      },
      { session },
    );
  }

  async findByIds(
    eventIds: Array<string | ObjectId>,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    if (eventIds.length === 0) return [];

    return mongoService.event
      .find(
        {
          _id: { $in: eventIds.map((id) => new ObjectId(id)) },
          calendarId: { $in: ownedCalendarIds },
        },
        { session },
      )
      .toArray();
  }

  /**
   * Range/someday read, per B3: two indexed branches (timed BSON Dates vs.
   * allDay/someday DateOnly strings), plus a join of the series base events
   * referenced by any returned occurrence (dedupe by id).
   */
  async list(
    query: EventListQuery,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    if (ownedCalendarIds.length === 0) return [];

    const primary =
      query.kind === "range"
        ? await this.listRange(query, ownedCalendarIds, session)
        : await this.listSomeday(query, ownedCalendarIds, session);

    const seriesIds = [
      ...new Set(
        primary
          .filter((event) => event.recurrence.kind === "occurrence")
          .map((event) =>
            (event.recurrence as { seriesId: ObjectId }).seriesId.toHexString(),
          ),
      ),
    ];

    const knownIds = new Set(primary.map((event) => event._id.toHexString()));
    const missingSeriesIds = seriesIds
      .filter((id) => !knownIds.has(id))
      .map((id) => new ObjectId(id));

    const baseEvents =
      missingSeriesIds.length > 0
        ? await mongoService.event
            .find(
              {
                _id: { $in: missingSeriesIds },
                calendarId: { $in: ownedCalendarIds },
              },
              { session },
            )
            .toArray()
        : [];

    return [...primary, ...baseEvents];
  }

  private async listRange(
    query: Extract<EventListQuery, { kind: "range" }>,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    const { start, end, priorities } = query;
    const calendarFilter = { calendarId: { $in: ownedCalendarIds } };
    const priorityFilter =
      priorities.length > 0 ? { priority: { $in: priorities } } : {};

    // Branch 1: timed events, stored as BSON Dates, overlapping [start, end).
    const timedFilter: Filter<EventRecord> = {
      ...calendarFilter,
      ...priorityFilter,
      "schedule.kind": "timed",
      "schedule.start": { $lt: new Date(end) },
      "schedule.end": { $gt: new Date(start) },
    };

    // Branch 2: all-day events, stored as DateOnly strings. Derive the
    // all-day window from the query's own instants (their calendar-date
    // portion), so a timed query range still overlaps same-day all-day
    // events correctly regardless of the caller's offset.
    const allDayStart = start.slice(0, 10);
    const allDayEnd = end.slice(0, 10);
    const allDayFilter: Filter<EventRecord> = {
      ...calendarFilter,
      ...priorityFilter,
      "schedule.kind": "allDay",
      "schedule.start": { $lt: allDayEnd },
      "schedule.end": { $gt: allDayStart },
    };

    const [timed, allDay] = await Promise.all([
      mongoService.event.find(timedFilter, { session }).toArray(),
      mongoService.event.find(allDayFilter, { session }).toArray(),
    ]);

    return [...timed, ...allDay];
  }

  private async listSomeday(
    query: Extract<EventListQuery, { kind: "someday" }>,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    const filter: Filter<EventRecord> = {
      calendarId: { $in: ownedCalendarIds },
      "schedule.kind": "someday",
      "schedule.period": query.period,
      "schedule.anchorDate": query.anchorDate,
    };

    return mongoService.event
      .find(filter, { session })
      .sort({ "schedule.sortOrder": 1 })
      .toArray();
  }

  async findByExternalReference(
    calendarId: ObjectId,
    externalEventId: string,
    session?: ClientSession,
  ): Promise<EventRecord | null> {
    return mongoService.event.findOne(
      {
        calendarId,
        "externalReference.eventId": externalEventId,
      },
      { session },
    );
  }

  async deleteByExternalReference(
    calendarId: ObjectId,
    externalEventId: string,
    session?: ClientSession,
  ): Promise<{ deletedCount: number; deletedIds: ObjectId[] }> {
    const existing = await mongoService.event.findOne(
      { calendarId, "externalReference.eventId": externalEventId },
      { session },
    );
    if (!existing) return { deletedCount: 0, deletedIds: [] };

    await mongoService.event.deleteOne({ _id: existing._id }, { session });
    return { deletedCount: 1, deletedIds: [existing._id] };
  }

  async findBySeriesId(
    seriesId: ObjectId,
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    return mongoService.event
      .find({ "recurrence.seriesId": seriesId }, { session })
      .toArray();
  }

  /**
   * Finds a not-yet-Google-linked occurrence of `seriesId` sitting at
   * `anchor` (Google's `originalStartTime` for a webhook-delivered
   * instance/cancellation) -- the local doc a Compass-created series
   * materialized before it had ever synced to Google. Used to converge the
   * Google echo of a Compass-created series onto the existing local
   * documents instead of inserting duplicates alongside them.
   */
  async findUnlinkedOccurrence(
    seriesId: ObjectId,
    anchor: Date,
    session?: ClientSession,
  ): Promise<EventRecord | null> {
    const allDayDate = anchor.toISOString().slice(0, 10);
    return mongoService.event.findOne(
      {
        "recurrence.kind": "occurrence",
        "recurrence.seriesId": seriesId,
        externalReference: null,
        $or: [
          { "schedule.kind": "timed", "schedule.start": anchor },
          { "schedule.kind": "allDay", "schedule.start": allDayDate },
        ],
      },
      { session },
    );
  }

  async insertOne(
    record: EventRecord,
    session?: ClientSession,
  ): Promise<EventRecord> {
    await mongoService.event.insertOne(record, { session });
    return record;
  }

  async insertMany(
    records: EventRecord[],
    session?: ClientSession,
  ): Promise<EventRecord[]> {
    if (records.length === 0) return [];
    await mongoService.event.insertMany(records, { session, ordered: false });
    return records;
  }

  async replaceOne(
    record: EventRecord,
    session?: ClientSession,
  ): Promise<EventRecord> {
    await mongoService.event.replaceOne({ _id: record._id }, record, {
      session,
    });
    return record;
  }

  async bulkReplace(
    records: EventRecord[],
    session?: ClientSession,
  ): Promise<void> {
    if (records.length === 0) return;

    const operations: AnyBulkWriteOperation<EventRecord>[] = records.map(
      (record) => ({
        replaceOne: {
          filter: { _id: record._id },
          replacement: record,
          upsert: true,
        },
      }),
    );

    await mongoService.event.bulkWrite(operations, { ordered: false, session });
  }

  async deleteMany(
    eventIds: ObjectId[],
    session?: ClientSession,
  ): Promise<void> {
    if (eventIds.length === 0) return;
    await mongoService.event.deleteMany(
      { _id: { $in: eventIds } },
      { session },
    );
  }

  async deleteBySeriesId(
    seriesId: ObjectId,
    session?: ClientSession,
  ): Promise<void> {
    await mongoService.event.deleteMany(
      { $or: [{ _id: seriesId }, { "recurrence.seriesId": seriesId }] },
      { session },
    );
  }

  async deleteByCalendarIds(
    calendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<{ deletedCount: number }> {
    if (calendarIds.length === 0) return { deletedCount: 0 };
    const result = await mongoService.event.deleteMany(
      { calendarId: { $in: calendarIds } },
      { session },
    );
    return { deletedCount: result.deletedCount };
  }

  async reorder(
    items: Array<{ eventId: string; sortOrder: number }>,
    ownedCalendarIds: ObjectId[],
    session?: ClientSession,
  ): Promise<void> {
    if (items.length === 0) return;

    const operations: AnyBulkWriteOperation<EventRecord>[] = items.map(
      ({ eventId, sortOrder }) => ({
        updateOne: {
          filter: {
            _id: new ObjectId(eventId),
            calendarId: { $in: ownedCalendarIds },
            "schedule.kind": "someday",
          },
          update: { $set: { "schedule.sortOrder": sortOrder } },
        },
      }),
    );

    await mongoService.event.bulkWrite(operations, { ordered: false, session });
  }
}

export const eventRepository = new EventRepository();
