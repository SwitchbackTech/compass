import { gSchema$Event } from "@core/types/gcal";
import { GaxiosError } from "googleapis-common";
import { Schema_CalendarList } from "@core/types/calendar.types";

const cancelled = (e: gSchema$Event) => {
  /* 
  'cancelled' is the same as deleted according to Gcal API
      - however, there's an exception for 'uncancelled recurring events',
        so this'll need to be updated once Compass supports recurring events
      - see 'status' section of: https://developers.google.com/calendar/api/v3/reference/events#resource
  */
  return e.status && e.status === "cancelled";
};

export const cancelledEventsIds = (events: gSchema$Event[]) => {
  const cancelledIds: string[] = [];
  events.filter(cancelled).forEach((e: gSchema$Event) => {
    //@ts-ignore
    cancelledIds.push(e.id);
  });
  return cancelledIds;
};

export const getPrimaryGcalId = (calendarList: Schema_CalendarList) => {
  const primaryGCal = calendarList.google.items[0];
  const gCalendarId = primaryGCal!.id as string;

  return gCalendarId;
};

export const isGoogleTokenExpired = (e: GaxiosError | Error) => {
  const is400 = "code" in e && e.code === "400";
  const hasInvalidMsg = "message" in e && e.message === "invalid_grant";
  const isInvalid = is400 && hasInvalidMsg;

  return isGoogleError(e) && isInvalid;
};

export const isGoogleError = (e: GaxiosError | Error) => {
  return e instanceof GaxiosError;
};

export const isFullSyncRequired = (e: GaxiosError | Error) => {
  const isFromGoogle = e instanceof GaxiosError;

  if (isFromGoogle && e.code && parseInt(e?.code) === 410) {
    return true;
  }

  return false;
};

export const isInvalidValue = (e: GaxiosError) => {
  return e.message === "Invalid Value";
};
