import dayjsOriginal, { ConfigType, Dayjs, OptionType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import dayOfYear from "dayjs/plugin/dayOfYear";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
import utcPlugin from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekday from "dayjs/plugin/weekday";

export type {
  ConfigType,
  ConfigTypeMap,
  Dayjs,
  DayjsTimezone,
  FormatObject,
  ManipulateType,
  OptionType,
  OpUnitType,
  PluginFunc,
  QUnitType,
  UnitType,
  UnitTypeLong,
  UnitTypeLongPlural,
  UnitTypeShort,
} from "dayjs";

export { Ls } from "dayjs";

dayjsOriginal.extend(utcPlugin);
dayjsOriginal.extend(timezone);
dayjsOriginal.extend(weekday);
dayjsOriginal.extend(dayOfYear);
dayjsOriginal.extend(weekOfYear);
dayjsOriginal.extend(isSameOrAfter);
dayjsOriginal.extend(isSameOrBefore);
dayjsOriginal.extend(isBetween);
dayjsOriginal.extend(customParseFormat); // for RFC formatting

export enum DateFormat {
  RFC5545 = "YYYYMMDD[T]HHmmss[Z]",
  RFC3339 = "YYYY-MM-DD[T]HH:mm:ss[Z]",
  RFC3339_OFFSET = "YYYY-MM-DDTHH:mm:ssZ", // can also be used as ISO8601
}

const dayjs = function dayjs(
  date?: ConfigType,
  format?: OptionType,
  locale?: string,
  strict?: boolean,
): Dayjs {
  return dayjsOriginal(date, format, locale, strict).tz();
} as unknown as typeof dayjsOriginal;

dayjs.prototype = dayjsOriginal.prototype;

Object.assign(dayjs, dayjsOriginal);

export const extend = () => {
  throw new Error("dayjs extension is not supported.");
};

export const isDayjs = dayjs.isDayjs.bind(dayjs);
export const locale = dayjs.locale.bind(dayjs);
export const tz = dayjs.tz.bind(dayjs);
export const unix = (t: number): Dayjs => dayjsOriginal.unix(t).tz();
export const utc = dayjs.utc.bind(dayjs);

dayjs.unix = unix;
dayjs.extend = extend;

export default dayjs;
