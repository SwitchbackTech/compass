import { ObjectId } from "bson";
import {
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import { CalendarProvider } from "@core/types/event.types";
import { type gSchema$CalendarListEntry } from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";

export class MapCalendar {
  static gcalToCompass(
    user: ObjectId | string,
    googleCalendar: gSchema$CalendarListEntry,
  ) {
    const metadata = GoogleCalendarMetadataSchema.parse({
      ...googleCalendar,
      provider: CalendarProvider.GOOGLE,
    });

    return CompassCalendarSchema.parse({
      _id: new ObjectId(),
      user,
      backgroundColor: googleCalendar.backgroundColor ?? "#9e9e9e",
      color: googleCalendar.foregroundColor ?? "#000000",
      selected: googleCalendar.selected ?? true,
      primary: googleCalendar.primary ?? false,
      timezone: googleCalendar.timeZone ?? dayjs.tz.guess(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    });
  }
}
