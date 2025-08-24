import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  gCalendar,
  gSchema$CalendarList,
  gSchema$CalendarListEntry,
} from "@core/types/gcal";
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

  const primaryGcal = gCalendarList.filter((c) => {
    return c.primary === true;
  })[0] as gSchema$CalendarList;

  const _ccalList = MapCalendarList.toCompass(primaryGcal);
  const cCalendarList = { ..._ccalList, user: userId } as Schema_CalendarList;

  const gCalendarIds = cCalendarList.google.items.map(
    (gcal) => gcal.id,
  ) as string[];

  return {
    cCalendarList,
    gCalendarIds,
    calListNextSyncToken,
  };
};
