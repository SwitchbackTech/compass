import type { Dayjs, PluginFunc } from "dayjs";
import dayjs from "dayjs";
import winston from "winston";

enum DateFormatEnum {
  RFC5545 = "YYYYMMDD[T]HHmmss[Z]",
  RFC5545_ZONELESS = "YYYYMMDD[T]HHmmss",
  RFC3339 = "YYYY-MM-DD[T]HH:mm:ss[Z]",
  RFC3339_OFFSET = "YYYY-MM-DDTHH:mm:ssZ", // can also be used as ISO8601

  DAY_COMPACT = "ddd", // Mon
  DAY_HOUR_MIN_M = "ddd h:mma", // Mon 1:15am

  HOURS_AM_SHORT_FORMAT = "h A",
  HOURS_AM_FORMAT = "h:mm A",
  HOURS_MINUTES_FORMAT = "HH:mm",

  MONTH_DAY_COMPACT_FORMAT = "MMM DD",
  MONTH_DAY_YEAR = "M-D-YYYY",
  MONTH_YEAR_COMPACT_FORMAT = "M/YYYY",

  YEAR_MONTH_FORMAT = "YYYY-MM",
  YEAR_MONTH_DAY_FORMAT = "YYYY-MM-DD",
  YEAR_MONTH_DAY_COMPACT_FORMAT = "YYYYMMDD",

  YMDHM_FORMAT = `${DateFormatEnum.YEAR_MONTH_DAY_FORMAT} ${DateFormatEnum.HOURS_MINUTES_FORMAT}`,
  YMDHAM_FORMAT = `${DateFormatEnum.YEAR_MONTH_DAY_FORMAT} ${DateFormatEnum.HOURS_AM_FORMAT}`,
}

type YearMonthDayFormat = string; // syntactic sugar for dev recognition

interface DateRange {
  startDate: YearMonthDayFormat;
  endDate: YearMonthDayFormat;
}

declare module "dayjs" {
  type ManipulateTypeSingular = Exclude<
    dayjs.ManipulateType,
    dayjs.UnitTypeLongPlural | "weeks"
  >;

  interface Dayjs {
    next(this: dayjs.Dayjs, unit: ManipulateTypeSingular): dayjs.Dayjs;
    startOfNextWeek(this: dayjs.Dayjs): dayjs.Dayjs;
    startOfNextMonth(this: dayjs.Dayjs): dayjs.Dayjs;
    weekMonthRange(this: dayjs.Dayjs): Record<"week" | "month", DateRange>;
    toRFC5545String(this: dayjs.Dayjs): string;
    toRFC3339String(this: dayjs.Dayjs): string;
    toRFC3339OffsetString(this: dayjs.Dayjs): string;
    toYearMonthDayString(this: dayjs.Dayjs): string;
    toRRuleDTSTARTString(this: dayjs.Dayjs, allDay?: boolean): string;
  }

  let defaultTimezone: string | undefined;
  let logger: winston.Logger;

  function monthFromZeroIndex(this: typeof dayjs, index: number): number;
  function monthStrFromZeroIndex(this: typeof dayjs, index: number): string;
  function rruleUntilToIsoString(this: typeof dayjs, rrule: string): string;
  function setDefaultTimezone(this: typeof dayjs, timezone: string): void;

  type IDateFormat = "RFC5545" | "RFC3339" | "RFC3339_OFFSET";

  let DateFormat: typeof DateFormatEnum;
}

function next(this: Dayjs, unit: dayjs.ManipulateTypeSingular): Dayjs {
  return this.add(1, unit);
}

function startOfNextWeek(this: Dayjs): Dayjs {
  return this.next("week").startOf("week");
}

function startOfNextMonth(this: Dayjs): Dayjs {
  return this.next("month").startOf("month");
}

function weekMonthRange(this: Dayjs): Record<"week" | "month", DateRange> {
  return {
    week: {
      startDate: this.startOf("week").toYearMonthDayString(),
      endDate: this.endOf("week").toYearMonthDayString(),
    },
    month: {
      startDate: this.startOf("month").toYearMonthDayString(),
      endDate: this.endOf("month").toYearMonthDayString(),
    },
  };
}

function toRFC5545String(this: Dayjs): string {
  return this.format(dayjs.DateFormat.RFC5545);
}

function toRFC3339String(this: Dayjs): string {
  return this.format(dayjs.DateFormat.RFC3339);
}

function toRFC3339OffsetString(this: Dayjs): string {
  return this.format(dayjs.DateFormat.RFC3339_OFFSET);
}

function toYearMonthDayString(this: Dayjs): string {
  return this.format(dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT);
}

function toRRuleDTSTARTString(this: Dayjs, allDay = false): string {
  const { RFC5545, YEAR_MONTH_DAY_COMPACT_FORMAT } = dayjs.DateFormat;

  return this.format(allDay ? YEAR_MONTH_DAY_COMPACT_FORMAT : RFC5545);
}

function monthFromZeroIndex(this: typeof dayjs, index: number): number {
  return Math.max(1, Math.min(index + 1, 12));
}

function monthStrFromZeroIndex(this: typeof dayjs, index: number): string {
  const month = this.monthFromZeroIndex(index);
  const prefix = month < 10 ? `0` : "";

  return `${prefix}${month}`;
}

/**
 * Convert a recurrence rule with UNTIL value to  date
 * @param rrule The full recurrence rule with UNTIL value
 * (e.g. "RRULE:FREQ=DAILY;UNTIL=20260108T005808Z")
 * @returns The UNTIL value, parsed as iso8601 (e.g. '2026-01-08T00:58:08.000Z')
 */
function rruleUntilToIsoString(this: typeof dayjs, rrule: string): string {
  const rules = rrule.split(";");
  const rule = rules.find((parts) => parts.toLowerCase().startsWith("until="));
  const until = rule?.split("=").pop();

  if (!until) throw Error("recurrence rule must have an until value");

  const origDateFromUntil = this(until, this.DateFormat.RFC5545).toISOString();

  return origDateFromUntil;
}

function setDefaultTimezone(this: typeof dayjs.tz) {
  const defaultTimezone = this.guess();

  Object.assign(this, { defaultTimezone });

  return this.setDefault(defaultTimezone);
}

/**
 * extend
 *
 * prevents external dayjs extensions
 * extensions should be applied within the `@core/util/date/dayjs.ts` file
 * @param plugin
 */
// function extend(plugin: PluginFunc<never>): Dayjs {
//   throw new Error(
//     `External plugins are not allowed - extension(${plugin.name}).`,
//   );
// }

export const dayjsCompassPlugin: PluginFunc<never> = (...params) => {
  const dayjsClass = params[1];
  const dayjsStatic = params[2];
  const setDefault = setDefaultTimezone.bind(dayjsStatic.tz);

  setDefault();

  dayjsClass.prototype.next = next;
  dayjsClass.prototype.startOfNextWeek = startOfNextWeek;
  dayjsClass.prototype.startOfNextMonth = startOfNextMonth;
  dayjsClass.prototype.toRFC5545String = toRFC5545String;
  dayjsClass.prototype.toRFC3339String = toRFC3339String;
  dayjsClass.prototype.toRFC3339OffsetString = toRFC3339OffsetString;
  dayjsClass.prototype.toYearMonthDayString = toYearMonthDayString;
  dayjsClass.prototype.toRRuleDTSTARTString = toRRuleDTSTARTString;
  dayjsClass.prototype.weekMonthRange = weekMonthRange;

  dayjsStatic.DateFormat = DateFormatEnum;

  dayjsStatic.monthFromZeroIndex = monthFromZeroIndex.bind(dayjsStatic);
  dayjsStatic.monthStrFromZeroIndex = monthStrFromZeroIndex.bind(dayjsStatic);
  dayjsStatic.rruleUntilToIsoString = rruleUntilToIsoString.bind(dayjsStatic);
  // dayjsStatic.extend = extend.bind(dayjsStatic);
};
