import { gSchema$Event } from "declarations";

export const cancelled = (e: gSchema$Event) => {
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
    cancelledIds.push(e.id);
  });
  return cancelledIds;
};

export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};
