import { gSchema$Event } from "@core/types/gcal";
import { GaxiosError } from "googleapis-common";

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

export const isAccessRevoked = (e: GaxiosError | Error) => {
  const isGoogleError = e instanceof GaxiosError;

  const is400 = "code" in e && e.code === "400";
  const hasInvalidMsg = "message" in e && e.message === "invalid_grant";
  const isInvalid = is400 && hasInvalidMsg;

  return isGoogleError && isInvalid;
};
