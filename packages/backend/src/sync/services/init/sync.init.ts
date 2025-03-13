import { Logger } from "@core/logger/winston.logger";
import { MapCalendarList } from "@core/mappers/map.calendarlist";
import { Schema_CalendarList } from "@core/types/calendar.types";
import {
  gCalendar,
  gSchema$CalendarList,
  gSchema$CalendarListEntry,
} from "@core/types/gcal";
import calendarService from "@backend/calendar/services/calendar.service";
import { ENV } from "@backend/common/constants/env.constants";
import { GcalError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import gcalService from "@backend/common/services/gcal/gcal.service";
import { createSync } from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import { watchEventsByGcalIds } from "../watch/sync.watch";

const logger = Logger("app:sync.init");

export const initSync = async (gcal: gCalendar, userId: string) => {
  const { cCalendarList, gCalendarIds, calListNextSyncToken } =
    await getCalendarsToSync(userId, gcal);

  await createSync(userId, cCalendarList, calListNextSyncToken);

  await calendarService.create(cCalendarList);

  if (isUsingHttps()) {
    await watchEventsByGcalIds(userId, gCalendarIds, gcal);
  } else {
    logger.warn(
      `Skipped gcal watch during sync init because BASEURL does not use HTTPS: '${ENV.BASEURL}'`,
    );
  }

  return gCalendarIds;
};

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
