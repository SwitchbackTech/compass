import { gSchema$Event } from "declarations";

export const cancelled = (e: gSchema$Event) => {
  return e.status && e.status === "cancelled";
};

export const cancelledEventsIds = (events: gSchema$Event[]) => {
  const cancelledIds: string[] = [];
  events.filter(cancelled).forEach((e: gSchema$Event) => {
    cancelledIds.push(e.id);
  });
  console.log(cancelledIds);
  return cancelledIds;
};

export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};
