import { inEffectiveTimeZone } from "@web/timezone/in-time-zone";

/** Minutes from midnight in the calendar's effective timezone. */
export const getLocalMinutes = (date: string | undefined) => {
  const parsed = inEffectiveTimeZone(date ?? new Date());

  return parsed.hour() * 60 + parsed.minute();
};
