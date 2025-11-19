import { ClientSession, ObjectId } from "mongodb";
import { z } from "zod/v4";
import { MapCalendar } from "@core/mappers/map.calendar";
import {
  CompassCalendarSchema,
  Schema_Calendar,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { gCalendar } from "@core/types/gcal";
import { Resource_Sync } from "@core/types/sync.types";
import { zObjectId } from "@core/types/type.utils";
import mongoService from "@backend/common/services/mongo.service";
import { getCalendarsToSync } from "@backend/sync/services/init/sync.init";
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
    userId: ObjectId | string,
    gcal: gCalendar,
    session?: ClientSession,
  ) {
    const _user = zObjectId.parse(userId);
    const bulkUpsert = mongoService.calendar.initializeUnorderedBulkOp();

    const googleCalendarResult = await getCalendarsToSync(gcal);
    const { calendars: googleCalendars } = googleCalendarResult;
    const { nextPageToken, nextSyncToken } = googleCalendarResult;

    await updateSync(
      Resource_Sync.CALENDAR,
      _user.toString(),
      Resource_Sync.CALENDAR,
      { nextSyncToken, nextPageToken: nextPageToken! },
      session,
    );

    const calendars = googleCalendars.map((calendar) =>
      MapCalendar.gcalToCompass(_user, calendar),
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
        user: _user,
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

  /**
   * Get calendars for a user
   */
  getByUser = async (userId: ObjectId | string) => {
    return await mongoService.calendar
      .find({ user: zObjectId.parse(userId) })
      .toArray();
  };

  /**
   * Get selected calendars for a user
   */
  getSelectedByUser = async (userId: ObjectId | string) => {
    return await mongoService.calendar
      .find({ user: zObjectId.parse(userId), selected: true })
      .toArray();
  };

  /**
   * Get primary calendar for a user
   */
  getPrimaryByUser = async (userId: ObjectId | string) => {
    return await mongoService.calendar.findOne({
      user: zObjectId.parse(userId),
      primary: true,
    });
  };

  /**
   * Update calendar selection status
   */
  toggleSelection = async (
    userId: ObjectId | string,
    calendars: Array<{ id: string | ObjectId; selected: boolean }>,
  ) => {
    const bulkUpdate = mongoService.calendar.initializeUnorderedBulkOp();

    CalendarService.calendarSelectionToggleSchema
      .parse(calendars)
      .forEach(({ id, selected }) => {
        bulkUpdate
          .find({ user: zObjectId.parse(userId), _id: zObjectId.parse(id) })
          .update({ $set: { selected, updatedAt: new Date() } });
      });

    const result = await bulkUpdate.execute();

    return result.isOk();
  };

  /**
   * Delete all calendars for a user
   */
  async deleteAllByUser(userId: ObjectId | string, session?: ClientSession) {
    const response = await mongoService.calendar.deleteMany(
      { user: zObjectId.parse(userId) },
      { session },
    );

    return response;
  }
}

export default new CalendarService();
