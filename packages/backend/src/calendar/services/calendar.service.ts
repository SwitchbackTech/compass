import { ClientSession, Filter, ObjectId } from "mongodb";
import { z } from "zod/v4";
import { MapCalendar } from "@core/mappers/map.calendar";
import {
  CalendarProvider,
  CompassCalendarSchema,
  Schema_Calendar,
} from "@core/types/calendar.types";
import { gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import { zObjectId } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { updateSync } from "@backend/sync/util/sync.queries";

class CalendarService {
  private static readonly calendarSelectionToggleSchema = z
    .array(
      z.object({
        id: zObjectId,
        selected: z.boolean(),
      }),
    )
    .nonempty();
  /**
   * initializeGoogleCalendars
   *
   * re-initializes calendar entries for a user
   * this method will delete calendars that are no longer present
   */
  async initializeGoogleCalendars(
    user: ObjectId,
    gcal: gCalendar,
    session?: ClientSession,
  ) {
    const bulkUpsert = mongoService.calendar.initializeUnorderedBulkOp();
    const googleCalendarResult = await syncService.getCalendarsToSync(gcal);
    const { calendars: googleCalendars } = googleCalendarResult;
    const { nextPageToken, nextSyncToken } = googleCalendarResult;

    await updateSync(
      Resource_Sync.CALENDAR,
      user.toString(),
      Resource_Sync.CALENDAR,
      { nextSyncToken, nextPageToken: nextPageToken! },
      session,
    );

    const calendars = googleCalendars.map((calendar) =>
      MapCalendar.gcalToCompass(user, calendar),
    );

    calendars.forEach(
      ({
        _id,
        user,
        selected,
        color,
        backgroundColor,
        primary,
        timezone,
        createdAt,
        updatedAt,
        metadata,
        ...calendar
      }) => {
        bulkUpsert
          .find({
            user,
            "metadata.provider": metadata.provider,
            "metadata.id": metadata.id,
          })
          .upsert()
          .update({
            $setOnInsert: {
              ...calendar,
              _id,
              selected,
              color,
              backgroundColor,
              primary,
              timezone,
              createdAt,
            },
            $set: { ...calendar, updatedAt, metadata },
          });
      },
    );

    bulkUpsert
      .find({
        user,
        "metadata.provider": CalendarProvider.GOOGLE,
        "metadata.id": { $nin: googleCalendars.map(({ id }) => id) },
      })
      .delete();

    const result = await bulkUpsert.execute({ session });

    return {
      googleCalendars,
      nextPageToken,
      nextSyncToken,
      acknowledged: result.isOk(),
      insertedCount: result.insertedCount,
      insertedIds: result.insertedIds,
      modifiedCount: result.modifiedCount,
      upsertedIds: result.upsertedIds,
      deletedCount: result.deletedCount,
    };
  }

  /**
   * Create a single calendar entry
   */
  create = async (calendar: Schema_Calendar) => {
    return await mongoService.calendar.insertOne(
      CompassCalendarSchema.parse(calendar),
    );
  };

  async getByUser(user: ObjectId, _id: ObjectId, session?: ClientSession) {
    const calendar = await mongoService.calendar.findOne(
      { user, _id },
      { session },
    );

    return calendar;
  }

  async getByUserAndProvider(
    user: ObjectId,
    id: string,
    provider: CalendarProvider,
  ) {
    const calendar = await mongoService.calendar.findOne({
      user,
      "metadata.id": id,
      "metadata.provider": provider,
    });

    return calendar;
  }

  /**
   * Get calendars for a user
   */
  getAllByUser = async (
    user: ObjectId,
    provider?: CalendarProvider,
    session?: ClientSession,
  ) => {
    const filter: Filter<Schema_Calendar> = { user };

    if (provider) Object.assign(filter, { "metadata.provider": provider });

    return await mongoService.calendar.find(filter, { session }).toArray();
  };

  /**
   * Get selected calendars for a user
   *
   * Including the provider arg will filter by provider also
   */
  getSelectedByUserAndProvider = async (
    user: ObjectId,
    provider?: CalendarProvider,
    session?: ClientSession,
  ) => {
    const filter: Filter<Schema_Calendar> = { user, selected: true };

    if (provider) Object.assign(filter, { "metadata.provider": provider });

    return await mongoService.calendar.find(filter, { session }).toArray();
  };

  /**
   * Get primary calendar for a user
   */
  getPrimaryByUser = async (user: ObjectId) => {
    return await mongoService.calendar.findOne({ user, primary: true });
  };

  /**
   * Delete all calendars for a user
   *
   * **Alert** ==> Never delete user's external calendar data
   */
  async deleteAllByUser(
    user: ObjectId,
    provider?: CalendarProvider,
    session?: ClientSession,
  ) {
    const filter: Filter<Schema_Calendar> = { user };

    if (provider) Object.assign(filter, { "metadata.provider": provider });

    const response = await mongoService.calendar.deleteMany(filter, {
      session,
    });

    return response;
  }

  /**
   * Update calendar selection status
   */
  toggleSelection = async (
    user: ObjectId,
    calendars: Array<{ id: ObjectId; selected: boolean }>,
  ) => {
    const bulkUpdate = mongoService.calendar.initializeUnorderedBulkOp();

    CalendarService.calendarSelectionToggleSchema
      .parse(calendars)
      .forEach(({ id, selected }) => {
        bulkUpdate
          .find({ user, _id: id })
          .update({ $set: { selected, updatedAt: new Date() } });
      });

    const result = await bulkUpdate.execute();

    return result.isOk();
  };
}

export default new CalendarService();
