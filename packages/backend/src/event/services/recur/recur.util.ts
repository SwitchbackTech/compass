import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";
import { ObjectId } from "mongodb";
import { RRule } from "rrule";
import { RRULE } from "@core/constants/core.constants";
import { YEAR_MONTH_DAY_FORMAT } from "@core/constants/date.constants";
import { Schema_Event_Core } from "@core/types/event.types";
import { GenericError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";

dayjs.extend(utc);

export const assembleInstances = (
  event: Schema_Event_Core,
  baseId?: string,
) => {
  if (
    !event.recurrence ||
    !event.recurrence.rule ||
    !event.recurrence.rule[0]
  ) {
    throw error(
      GenericError.DeveloperError,
      "Failed to assemble recurring events",
    );
  }

  const rule = event.recurrence.rule[0];
  const events = _generateInstances(rule, event, baseId);

  return events;
};

const _generateInstances = (
  rule: string,
  orig: Schema_Event_Core,
  baseId?: string,
) => {
  if (!orig.startDate || !orig.endDate) {
    throw error(GenericError.DeveloperError, "Failed to generate events");
  }

  const _id = baseId ? baseId : new ObjectId().toString();

  const fullRule = _getRule(rule, orig.startDate, orig.endDate);
  const _dates = fullRule.all();
  const dates = _dates;

  const instances = dates.map((date) => {
    const { startDate, endDate } = _getDates(rule, date);

    const event = {
      ...orig,
      _id: undefined,
      startDate,
      endDate,
      recurrence: {
        rule: [rule],
        eventId: _id,
      },
    };

    delete event.order;
    return event;
  });

  const base = {
    ...orig,
    _id: new ObjectId(_id),
    recurrence: { rule: [rule], eventId: _id },
  };
  const includeBase = baseId === undefined;
  const events = includeBase ? [base, ...instances] : [...instances];

  return events;
};

const _getDates = (rule: string, nextInstance: Date) => {
  let start: Dayjs = dayjs.utc(nextInstance);
  let end: Dayjs;

  if (rule === RRULE.WEEK) {
    start = dayjs.utc(nextInstance);
    end = start.add(6, "day");
  } else if (rule === RRULE.MONTH) {
    start = start.startOf("month");
    end = start.endOf("month");
  } else {
    throw error(
      GenericError.DeveloperError,
      "Failed to get dates (rule not supported yet)",
    );
  }

  return {
    startDate: start.format(YEAR_MONTH_DAY_FORMAT),
    endDate: end.format(YEAR_MONTH_DAY_FORMAT),
  };
};

const _getRule = (rule: string, startDate: string, endDate: string) => {
  const nextStart = _getNextStart(rule, startDate, endDate)
    .utc()
    .format("YYYYMMDDThhmmss");

  const _rule = `DTSTART=${nextStart}Z\n${rule}`;
  const fullRule = RRule.fromString(_rule);
  return fullRule;
};

const _getNextStart = (rule: string, startDate: string, endDate: string) => {
  switch (rule) {
    case RRULE.WEEK:
      return _getNextSunday(startDate);
      break;
    case RRULE.MONTH:
      return _getNextMonth(endDate);
      break;
    default:
      throw error(GenericError.DeveloperError, "Failed to get next start");
  }
};

const _getNextMonth = (target: string) => {
  const date = dayjs(target, YEAR_MONTH_DAY_FORMAT).hour(0).minute(0).second(0);

  const firstOfNextMonth = date.add(1, "month").date(1);
  return firstOfNextMonth;
};

const _getNextSunday = (startDate: string) => {
  const date = dayjs(startDate, YEAR_MONTH_DAY_FORMAT)
    .hour(0)
    .minute(0)
    .second(0);

  const dayOfWeek = date.day();

  let daysUntilNextSunday = (7 - dayOfWeek) % 7;
  if (daysUntilNextSunday === 0) {
    daysUntilNextSunday = 7;
  }

  const nextSunday = date.add(daysUntilNextSunday, "day");
  return nextSunday;
};
