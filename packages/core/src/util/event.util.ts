import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export const isAllDay = (event: Schema_Event) =>
  event !== undefined &&
  // 'YYYY-MM-DD' has 10 chars
  event.startDate?.length === 10 &&
  event.endDate?.length === 10;

export const notCancelled = (e: gSchema$Event) => {
  return e.status && e.status !== "cancelled";
};
