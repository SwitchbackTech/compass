import { gSchema$Event } from "@core/types/gcal";

/** Google Calendar event utilities */
export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};
