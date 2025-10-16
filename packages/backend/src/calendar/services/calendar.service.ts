import { ObjectId } from "mongodb";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
  Schema_Calendar,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import mongoService from "@backend/common/services/mongo.service";

class CalendarService {
  /**
   * Add Google calendar entries for a user
   */
  add = async (
    integration: "google",
    calendarEntries: gSchema$CalendarListEntry[],
    userId: string,
  ) => {
    if (integration !== "google") {
      throw new Error("Only Google integration is currently supported");
    }

    const calendarDocuments = calendarEntries.map((entry) => {
      const metadata = GoogleCalendarMetadataSchema.parse({
        ...entry,
        provider: CalendarProvider.GOOGLE,
      });

      return CompassCalendarSchema.parse({
        _id: new ObjectId(),
        user: userId,
        backgroundColor: entry.backgroundColor || "#3f51b5",
        color: entry.foregroundColor || "#ffffff",
        selected: entry.selected ?? true,
        primary: entry.primary ?? false,
        timezone: entry.timeZone || null,
        createdAt: new Date(),
        updatedAt: null,
        metadata,
      });
    });

    const result = await mongoService.calendar.insertMany(calendarDocuments, {
      ordered: false,
    });

    return result;
  };

  /**
   * Create a single calendar entry
   */
  create = async (calendar: Schema_Calendar) => {
    return await mongoService.calendar.insertOne(calendar);
  };

  /**
   * Get calendars for a user
   */
  getByUser = async (userId: string) => {
    return await mongoService.calendar.find({ user: userId }).toArray();
  };

  /**
   * Get selected calendars for a user
   */
  getSelectedByUser = async (userId: string) => {
    return await mongoService.calendar
      .find({ user: userId, selected: true })
      .toArray();
  };

  /**
   * Get primary calendar for a user
   */
  getPrimaryByUser = async (userId: string) => {
    return await mongoService.calendar.findOne({
      user: userId,
      primary: true,
    });
  };

  /**
   * Update calendar selection status
   */
  updateSelection = async (
    userId: string,
    calendarId: string,
    selected: boolean,
  ) => {
    return await mongoService.calendar.updateOne(
      { user: userId, "metadata.id": calendarId },
      {
        $set: {
          selected,
          updatedAt: new Date(),
        },
      },
    );
  };

  /**
   * Delete all calendars for a user
   */
  async deleteAllByUser(userId: string) {
    const filter = { user: userId };
    const response = await mongoService.calendar.deleteMany(filter);
    return response;
  }

  /**
   * Delete calendars by integration type for a user
   */
  deleteByIntegration = async (integration: "google", userId: string) => {
    const response = await mongoService.calendar.deleteMany({
      user: userId,
      "metadata.provider": integration,
    });

    return response;
  };
}

export default new CalendarService();
