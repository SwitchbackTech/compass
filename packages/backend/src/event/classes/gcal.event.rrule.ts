import { ObjectId, WithId } from "mongodb";
import { Options, RRule, RRuleStrOptions, rrulestr } from "rrule";
import { ParsedOptions } from "rrule/dist/esm/types";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { gEventToCompassEvent } from "@core/mappers/map.event";
import { Schema_Event_Recur_Instance } from "@core/types/event.types";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { diffRRuleOptions } from "@core/util/event/event.util";
import {
  getGcalEventDateFormat,
  parseGCalEventDate,
} from "@core/util/event/gcal.event.util";

export class GcalEventRRule extends RRule {
  #event: gSchema$Event;
  #isAllDay: boolean;
  #dateKey: "date" | "dateTime";
  #dateFormat: string;
  #durationMs!: number;
  #startDate!: Dayjs;
  #endDate!: Dayjs;
  #timezone!: string;

  constructor(event: gSchema$EventBase, options: Partial<Options> = {}) {
    super(GcalEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#isAllDay = "date" in this.#event.start!;
    this.#dateKey = this.#isAllDay ? "date" : "dateTime";
    this.#dateFormat = getGcalEventDateFormat(this.#event.start);
    this.#timezone = this.#event.start?.timeZone ?? dayjs.tz.guess();

    const { start, end } = this.#event;

    this.#startDate = parseGCalEventDate(start);
    this.#endDate = parseGCalEventDate(end);
    this.#durationMs = this.#endDate.diff(this.#startDate, "milliseconds");
  }

  static #initOptions(
    event: gSchema$EventBase,
    _options: Partial<Options> = {},
  ): Partial<Options> {
    const startDate = parseGCalEventDate(event.start);
    const dtstart = startDate.local().toDate();
    const tzid = dayjs.tz.guess();
    const opts: Partial<RRuleStrOptions> = { dtstart, tzid };
    const recurrence = event.recurrence?.join("\n").trim();
    const valid = recurrence?.length > 0;
    const rruleSet = valid ? rrulestr(recurrence!, opts) : { origOptions: {} };
    const rruleOptions = { ...rruleSet.origOptions, ..._options };
    const options = { ...rruleOptions, dtstart, tzid };

    if (options.until instanceof Date) {
      options.count = undefined as unknown as number;
    }

    return options;
  }

  diffOptions(rrule: GcalEventRRule): Array<[keyof ParsedOptions, unknown]> {
    return diffRRuleOptions(rrule, this);
  }

  toRecurrence(): string[] {
    return this.toString().split("\n");
  }

  override all(
    iterator: (d: Date, len: number) => boolean = (_, index) =>
      index < GCAL_MAX_RECURRENCES,
  ): Date[] {
    const dates = super.all(iterator);
    const firstInstance = dates[0];
    const firstInstanceStartDate = dayjs(firstInstance).tz(this.#timezone);
    const includesDtStart = this.#startDate.isSame(firstInstanceStartDate);
    const rDates = includesDtStart ? [] : [this.#startDate.toDate()];

    return rDates.concat(dates);
  }

  /**
   * instances
   *
   * @memberof GcalEventRRule
   * @description Returns all instances of the event based on the recurrence rule.
   * @note **This is a test-only method for now, it is not to be used in production.**
   */
  instances(): gSchema$EventInstance[] {
    return this.all().map((date) => {
      const startDate = dayjs(date).tz(this.#timezone);
      const endDate = startDate.add(this.#durationMs, "milliseconds");

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { recurrence, ...eventWithoutRecurrence } = {
        ...this.#event,
        id: `${this.#event.id}_${startDate.toRRuleDTSTARTString(this.#isAllDay)}`,
        recurringEventId: this.#event.id!,
        start: {
          [this.#dateKey]: startDate?.format(this.#dateFormat),
          timeZone: this.#timezone,
        },
        end: {
          [this.#dateKey]: endDate.format(this.#dateFormat),
          timeZone: this.#timezone,
        },
      };

      return eventWithoutRecurrence;
    });
  }

  /**
   * compassInstances
   *
   * @memberof GcalEventRRule
   * @description Returns all instances of the event mapped to Compass Event format.
   * @note **This is a test-only method for now, it is not to be used in production.**
   */
  compassInstances(
    userId: string,
    baseId: ObjectId,
  ): Array<WithId<Omit<Schema_Event_Recur_Instance, "_id">>> {
    return this.instances().map((event) => ({
      ...gEventToCompassEvent(event, userId),
      _id: baseId,
      recurrence: { eventId: baseId.toString() },
    }));
  }
}
