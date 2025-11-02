import { ObjectId } from "bson";
import {
  CalendarProvider,
  CompassCalendarSchema,
  GoogleCalendarMetadataSchema,
} from "@core/types/calendar.types";
import { gSchema$CalendarListEntry } from "@core/types/gcal";
import { generateCalendarColorScheme } from "@core/util/color.utils";
import dayjs from "@core/util/date/dayjs";

export class MapCalendar {
  static gcalToCompass(
    user: ObjectId,
    googleCalendar: gSchema$CalendarListEntry,
  ) {
    // generate fallback colors
    const { backgroundColor, color } = generateCalendarColorScheme();

    const metadata = GoogleCalendarMetadataSchema.parse({
      ...googleCalendar,
      provider: CalendarProvider.GOOGLE,
    });

    return CompassCalendarSchema.parse({
      _id: new ObjectId(),
      user,
      backgroundColor: googleCalendar.backgroundColor ?? backgroundColor,
      color: googleCalendar.foregroundColor ?? color,
      selected: googleCalendar.selected ?? true,
      primary: googleCalendar.primary ?? false,
      timezone: googleCalendar.timeZone ?? dayjs.tz.guess(),
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata,
    });
  }
}
