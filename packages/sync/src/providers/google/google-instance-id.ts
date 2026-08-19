import dayjs from "@core/util/date/dayjs";

// Google instance ids are `{seriesId}_{originalStart}`: all-day YYYYMMDD,
// timed YYYYMMDDTHHMMSSZ (always UTC). Compass mints these when addressing an
// occurrence by GET, and Google's incremental cancelled-instance payloads often
// carry only this id (no recurringEventId / originalStartTime). Mint and parse
// must stay byte-identical so a sparse cancellation reconstructs the same
// recurrenceId the series projection uses.

export function googleInstanceEventId(
  seriesProviderEventId: string,
  originalStartAt: string,
  scheduleKind: "timed" | "allDay",
): string {
  const instant = dayjs.utc(originalStartAt);
  const suffix =
    scheduleKind === "allDay"
      ? instant.format(dayjs.DateFormat.YEAR_MONTH_DAY_COMPACT_FORMAT)
      : instant.format(dayjs.DateFormat.RFC5545);
  return `${seriesProviderEventId}_${suffix}`;
}

export interface ParsedGoogleInstanceId {
  readonly seriesProviderId: string;
  // Compass recurrence identity: UTC ISO with milliseconds (Date#toISOString).
  readonly recurrenceId: string;
  readonly scheduleKind: "timed" | "allDay";
}

const TIMED_INSTANCE_ID = /^(.*)_(\d{8}T\d{6}Z)$/;
const ALL_DAY_INSTANCE_ID = /^(.*)_(\d{8})$/;

export function parseGoogleInstanceEventId(
  providerEventId: string,
): ParsedGoogleInstanceId | null {
  const timed = TIMED_INSTANCE_ID.exec(providerEventId);
  if (timed) {
    return parseSuffix(timed[1], timed[2], "timed", dayjs.DateFormat.RFC5545);
  }
  const allDay = ALL_DAY_INSTANCE_ID.exec(providerEventId);
  if (allDay) {
    return parseSuffix(
      allDay[1],
      allDay[2],
      "allDay",
      dayjs.DateFormat.YEAR_MONTH_DAY_COMPACT_FORMAT,
    );
  }
  return null;
}

function parseSuffix(
  seriesProviderId: string | undefined,
  suffix: string | undefined,
  scheduleKind: "timed" | "allDay",
  format: string,
): ParsedGoogleInstanceId | null {
  if (!seriesProviderId || !suffix) return null;
  const instant = dayjs.utc(suffix, format, true);
  if (!instant.isValid()) return null;
  return {
    seriesProviderId,
    recurrenceId: instant.toDate().toISOString(),
    scheduleKind,
  };
}
