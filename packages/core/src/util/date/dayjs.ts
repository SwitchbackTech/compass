import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import dayOfYear from "dayjs/plugin/dayOfYear";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import updateLocale from "dayjs/plugin/updateLocale";
import utcPlugin from "dayjs/plugin/utc";
import weekOfYear from "dayjs/plugin/weekOfYear";
import weekday from "dayjs/plugin/weekday";
import { dayjsCompassPlugin } from "@core/util/date/dayjs-compass.plugin";

export type {
  ConfigType,
  ConfigTypeMap,
  Dayjs,
  DayjsTimezone,
  FormatObject,
  IDateFormat,
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

dayjs.extend(utcPlugin);
dayjs.extend(timezone);
dayjs.extend(weekday);
dayjs.extend(dayOfYear);
dayjs.extend(weekOfYear);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(customParseFormat); // for RFC formatting
dayjs.extend(dayjsCompassPlugin);
dayjs.extend(updateLocale);
dayjs.extend(relativeTime, {
  thresholds: [
    { l: "s", r: 1 },
    { l: "m", r: 1 },
    { l: "mm", r: 59, d: "minute" },
    { l: "h", r: 1 },
    { l: "hh", r: 23, d: "hour" },
    { l: "d", r: 1 },
    { l: "dd", r: 29, d: "day" },
    { l: "M", r: 1 },
    { l: "MM", r: 11, d: "month" },
    { l: "y", r: 1 },
    { l: "yy", d: "year" },
  ],
  rounding: (t: number) => Math.round(t * Math.pow(10, 1)) / Math.pow(10, 1),
});

dayjs.updateLocale("en", {
  relativeTime: {
    future: "%s from now",
    past: "%s ago",
    s: "a few seconds",
    m: "a minute",
    mm: "%d minutes",
    h: "an hour",
    hh: "%d hours",
    d: "a day",
    dd: "%d days",
    M: "a month",
    MM: "%d months",
    y: "a year",
    yy: "%d years",
  },
});

export default dayjs;
