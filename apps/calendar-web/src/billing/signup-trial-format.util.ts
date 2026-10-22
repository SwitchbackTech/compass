import dayjs from "@core/util/date/dayjs";

/** Charge date copy: "Monday, September 29" from trial length and a reference instant. */
export function formatTrialChargeDate(
  trialLengthDays: number,
  now: dayjs.Dayjs = dayjs(),
): string {
  return now.add(trialLengthDays, "day").format("dddd, MMMM D");
}
