import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import dayOfYear from "dayjs/plugin/dayOfYear";
import isBetween from "dayjs/plugin/isBetween";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import timezone from "dayjs/plugin/timezone";
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

export default dayjs;
