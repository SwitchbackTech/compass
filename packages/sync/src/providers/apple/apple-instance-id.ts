import dayjs from "@core/util/date/dayjs";

// Apple recurring-instance ids mirror Google's `{seriesId}_{originalStart}`
// suffix so sparse cancellations and reader href mappings stay aligned with
// Compass projection recurrenceIds. iCloud shares one UID across master and
// exception VEVENTs in a resource; the suffix disambiguates instances.

export function appleInstanceEventId(
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
