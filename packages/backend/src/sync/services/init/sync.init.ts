import { gCalendar, gSchema$CalendarListEntry } from "@core/types/gcal";
import calendarService from "@backend/calendar/services/calendar.service";
import { error } from "@backend/common/errors/handlers/error.handler";
import { GcalError } from "@backend/common/errors/integration/gcal/gcal.errors";
import gcalService from "@backend/common/services/gcal/gcal.service";

export const getCalendarsToSync = async (userId: string, gcal: gCalendar) => {
  const { items, nextSyncToken: calListNextSyncToken } =
    await gcalService.getCalendarlist(gcal);

  if (!calListNextSyncToken) {
    throw error(GcalError.NoSyncToken, "Failed to get Calendar(list)s to sync");
  }

  const gCalendarList = items as gSchema$CalendarListEntry[];

  // Store/update calendars in our database
  const existingCalendars = await calendarService.getByUser(userId);

  if (existingCalendars.length === 0) {
    // First sync - add all calendars
    await calendarService.add("google", gCalendarList, userId);
  } else {
    // Update existing calendars or add new ones
    // For now, we'll add any new calendars that don't exist
    const existingCalendarIds = new Set(
      existingCalendars.map((cal) => cal.metadata.id),
    );

    const newCalendars = gCalendarList.filter(
      (cal) => !existingCalendarIds.has(cal.id),
    );

    if (newCalendars.length > 0) {
      await calendarService.add("google", newCalendars, userId);
    }
  }

  // Get updated calendar list from our database
  const updatedCalendars = await calendarService.getSelectedByUser(userId);

  const gCalendarIds = updatedCalendars.map(
    (calendar) => calendar.metadata.id,
  ) as string[];

  return {
    updatedCalendars,
    gCalendarIds,
    calListNextSyncToken,
  };
};
