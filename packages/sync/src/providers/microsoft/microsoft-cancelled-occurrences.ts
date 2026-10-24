import dayjs from "@core/util/date/dayjs";

/** Map Graph seriesMaster cancelledOccurrences to RFC5545 EXDATE lines (UTC Z). */
export function cancelledOccurrencesToExdateRules(
  cancelledOccurrences: readonly string[] | undefined,
): readonly string[] {
  if (!cancelledOccurrences?.length) return [];
  const rules: string[] = [];
  for (const originalStart of cancelledOccurrences) {
    const parsed = new Date(originalStart);
    if (Number.isNaN(parsed.getTime())) continue;
    rules.push(`EXDATE:${dayjs.utc(parsed).format("YYYYMMDD[T]HHmmss[Z]")}`);
  }
  return rules;
}
