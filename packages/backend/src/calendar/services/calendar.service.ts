import { type calendar_v3 } from "@googleapis/calendar";
import {
  type AnyBulkWriteOperation,
  type BulkWriteResult,
  type ClientSession,
  type ObjectId,
} from "mongodb";
import { Resource_Sync } from "@core/types/sync.types";
import { zObjectId } from "@core/types/type.utils";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { mapGoogleCalendar } from "@backend/calendar/calendar.record.mapper";
import { type GoogleRequestContext } from "@backend/common/services/gcal/gcal.context";
import mongoService from "@backend/common/services/mongo.service";
import { getCalendarsToSync } from "@backend/sync/services/init/google-sync-init";
import { updateSync } from "@backend/sync/services/records/sync-records.repository";

class CalendarService {
  /**
   * initializeGoogleCalendars
   *
   * Upserts every Google calendar the user's account exposes as a
   * CalendarRecord (discovery). Event import itself stays primary-calendar-
   * only at this packet (packet 04 owns importing from the other discovered
   * calendars; arbitrary writable targets are packet 05).
   */
  async initializeGoogleCalendars(
    userId: ObjectId | string,
    context: GoogleRequestContext,
    session?: ClientSession,
  ) {
    const userObjectId = zObjectId.parse(userId);

    const googleCalendarResult = await getCalendarsToSync(context);
    const {
      calendars: googleCalendars,
      nextPageToken,
      nextSyncToken,
    } = googleCalendarResult;

    await updateSync(
      Resource_Sync.CALENDAR,
      userObjectId.toString(),
      Resource_Sync.CALENDAR,
      { nextSyncToken, nextPageToken },
      session,
    );

    const { result } = await this.upsertGoogleCalendarEntries(
      userObjectId,
      googleCalendars,
      session,
    );

    const googleCalendarIds = googleCalendars
      .map(({ id }) => id)
      .filter((id): id is string => !!id);

    // Valid ONLY here because `googleCalendars` is the complete calendarlist
    // (full discovery), not a delta - archiving every google calendar absent
    // from a delta would wipe out calendars the delta simply didn't mention.
    // Kept out of `upsertGoogleCalendarEntries` for that reason.
    const sweepResult = await mongoService.calendar.updateMany(
      {
        userId: userObjectId,
        "source.provider": "google",
        "source.calendarId": { $nin: googleCalendarIds },
      },
      { $set: { isActive: false, updatedAt: new Date() } },
      { session },
    );

    const upsertOk = result === null || result.ok === 1;

    return {
      googleCalendars,
      nextPageToken,
      nextSyncToken,
      acknowledged: upsertOk && sweepResult.acknowledged,
      insertedCount: result?.insertedCount ?? 0,
      insertedIds: result?.insertedIds ?? {},
      modifiedCount: (result?.modifiedCount ?? 0) + sweepResult.modifiedCount,
      upsertedIds: result?.upsertedIds ?? {},
      deletedCount: result?.deletedCount ?? 0,
    };
  }

  /**
   * upsertGoogleCalendarEntries
   *
   * Shared upsert core for both full-list discovery
   * (initializeGoogleCalendars) and incremental calendarlist reconciliation
   * (google-calendarlist.service): maps each Google entry onto its Compass
   * CalendarRecord - reusing an existing row's _id/isVisible when one exists
   * (A3, A16) - and bulk-upserts. Deliberately does NOT archive anything
   * absent from `entries`; that sweep is only correct against a full list
   * (see initializeGoogleCalendars) and would wrongly archive every calendar
   * a partial delta simply didn't mention.
   */
  async upsertGoogleCalendarEntries(
    userId: ObjectId | string,
    entries: calendar_v3.Schema$CalendarListEntry[],
    session?: ClientSession,
  ): Promise<{ records: CalendarRecord[]; result: BulkWriteResult | null }> {
    const userObjectId = zObjectId.parse(userId);

    if (entries.length === 0) {
      return { records: [], result: null };
    }

    const existingByGoogleId = new Map<
      string,
      Pick<CalendarRecord, "_id" | "isVisible">
    >(
      (
        await mongoService.calendar
          .find(
            { userId: userObjectId, "source.provider": "google" },
            { session },
          )
          .toArray()
      ).flatMap((record) =>
        record.source.provider === "google"
          ? [
              [
                record.source.calendarId,
                { _id: record._id, isVisible: record.isVisible },
              ] as const,
            ]
          : [],
      ),
    );

    const records = entries.map((entry) =>
      mapGoogleCalendar(entry, {
        userId: userObjectId,
        existing: entry.id ? existingByGoogleId.get(entry.id) : undefined,
      }),
    );

    const operations: AnyBulkWriteOperation<CalendarRecord>[] = records.map(
      (record) => {
        // mapGoogleCalendar always returns a "google" source; narrow so
        // `.calendarId` is accessible.
        if (record.source.provider !== "google") {
          throw new Error("Expected a Google calendar record");
        }
        const googleCalendarId = record.source.calendarId;

        return {
          updateOne: {
            filter: {
              userId: userObjectId,
              "source.provider": "google",
              "source.calendarId": googleCalendarId,
            },
            update: {
              $setOnInsert: { _id: record._id, createdAt: record.createdAt },
              $set: {
                userId: record.userId,
                name: record.name,
                description: record.description,
                timeZone: record.timeZone,
                foregroundColor: record.foregroundColor,
                backgroundColor: record.backgroundColor,
                access: record.access,
                isPrimary: record.isPrimary,
                isVisible: record.isVisible,
                isActive: record.isActive,
                source: record.source,
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        };
      },
    );

    const result = await mongoService.calendar.bulkWrite(operations, {
      ordered: false,
      session,
    });

    const googleCalendarIds = entries
      .map(({ id }) => id)
      .filter((id): id is string => !!id);

    const freshRecords = await mongoService.calendar
      .find(
        {
          userId: userObjectId,
          "source.provider": "google",
          "source.calendarId": { $in: googleCalendarIds },
        },
        { session },
      )
      .toArray();

    return { records: freshRecords, result };
  }

  /**
   * Soft-deletes one Google calendar (the calendarlist delta says it was
   * hidden or removed). Idempotent: archiving an already-inactive row is a
   * no-op state-wise. Returns null when the user never had a row for this
   * Google calendar id (e.g. it was never imported) - callers should treat
   * that as "nothing to tear down", not create an archived row for it.
   */
  archiveGoogleCalendar = async (
    userId: ObjectId | string,
    gCalendarId: string,
  ) => {
    return mongoService.calendar.findOneAndUpdate(
      {
        userId: zObjectId.parse(userId),
        "source.provider": "google",
        "source.calendarId": gCalendarId,
      },
      { $set: { isActive: false, updatedAt: new Date() } },
      { returnDocument: "after" },
    );
  };

  /**
   * Get every calendar record owned by a user.
   */
  list = async (userId: ObjectId | string) => {
    return mongoService.calendar
      .find({ userId: zObjectId.parse(userId) })
      .toArray();
  };

  /**
   * Bulk-write visibility for a set of the user's calendars (B11).
   */
  setVisibility = async (
    userId: ObjectId | string,
    items: Array<{ calendarId: string; isVisible: boolean }>,
  ) => {
    const userObjectId = zObjectId.parse(userId);
    const operations: AnyBulkWriteOperation<CalendarRecord>[] = items.map(
      ({ calendarId, isVisible }) => ({
        updateOne: {
          filter: { _id: zObjectId.parse(calendarId), userId: userObjectId },
          update: { $set: { isVisible, updatedAt: new Date() } },
        },
      }),
    );

    const result = await mongoService.calendar.bulkWrite(operations, {
      ordered: false,
    });

    return result.ok === 1;
  };

  /**
   * The user's single Compass-local calendar (someday events + unscheduled
   * conversions land here).
   */
  getLocalCalendar = async (userId: ObjectId | string) => {
    return mongoService.calendar.findOne({
      userId: zObjectId.parse(userId),
      "source.provider": "local",
    });
  };

  /**
   * The user's primary Google calendar, if connected. This is the only
   * writable Google target at this packet (A24; arbitrary targets are 05).
   */
  getPrimaryGoogleCalendar = async (userId: ObjectId | string) => {
    return mongoService.calendar.findOne({
      userId: zObjectId.parse(userId),
      "source.provider": "google",
      isPrimary: true,
      isActive: true,
    });
  };

  /**
   * Every active Google-sourced calendar the user has (any access level),
   * used to fan out per-calendar event import (packet 04).
   */
  getActiveGoogleCalendars = async (userId: ObjectId | string) => {
    return mongoService.calendar
      .find({
        userId: zObjectId.parse(userId),
        "source.provider": "google",
        isActive: true,
      })
      .toArray();
  };

  /**
   * A calendar the user owns and can currently write to.
   */
  getOwnedActiveCalendar = async (
    userId: ObjectId | string,
    calendarId: ObjectId | string,
  ) => {
    return mongoService.calendar.findOne({
      _id: zObjectId.parse(calendarId),
      userId: zObjectId.parse(userId),
      isActive: true,
    });
  };

  /**
   * Delete all calendars for a user.
   */
  async deleteAllByUser(userId: ObjectId | string, session?: ClientSession) {
    return mongoService.calendar.deleteMany(
      { userId: zObjectId.parse(userId) },
      { session },
    );
  }
}

export default new CalendarService();
