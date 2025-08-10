import { Options, RRule, RRuleStrOptions, rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { gEventToCompassEvent } from "@core/mappers/map.event";
import { Event_Core } from "@core/types/event.types";
import {
  gSchema$Event,
  gSchema$EventBase,
  gSchema$EventInstance,
} from "@core/types/gcal";
import dayjs from "@core/util/date/dayjs";
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

  constructor(
    event: gSchema$EventBase,
    options: Partial<Pick<Options, "count" | "freq" | "interval">> = {},
  ) {
    super(GcalEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#isAllDay = "date" in this.#event.start!;
    this.#dateKey = this.#isAllDay ? "date" : "dateTime";
    this.#dateFormat = getGcalEventDateFormat(this.#event.start);

    const { start, end } = this.#event;
    const startDate = parseGCalEventDate(start);
    const endDate = parseGCalEventDate(end);

    this.#durationMs = endDate.diff(startDate, "milliseconds");
  }

  static #initOptions(
    event: gSchema$EventBase,
    options: Partial<Pick<Options, "count" | "freq" | "interval">> = {},
  ): Partial<Options> {
    const startDate = parseGCalEventDate(event.start);
    const dtstart = startDate.local().toDate();
    const tzid = dayjs.tz.guess();
    const opts: Partial<RRuleStrOptions> = { dtstart, tzid };
    const recurrence = event.recurrence?.join("\n").trim();
    const valid = recurrence?.length > 0;
    const rruleSet = valid ? rrulestr(recurrence!, opts) : { origOptions: {} };
    const rruleOptions = { ...rruleSet.origOptions, ...options };
    const rawCount = rruleOptions.count ?? GCAL_MAX_RECURRENCES;
    const count = Math.min(rawCount, GCAL_MAX_RECURRENCES);

    return { ...rruleOptions, count, dtstart, tzid };
  }

  toRecurrence(): string[] {
    return this.toString().split("\n");
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
      const timezone = dayjs.tz.guess();
      const tzid = this.#event.start?.timeZone ?? timezone;
      const startDate = dayjs(date).tz(tzid);
      const endDate = startDate.add(this.#durationMs, "milliseconds");

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { recurrence, ...eventWithoutRecurrence } = {
        ...this.#event,
        id: `${this.#event.id}_${startDate.toRRuleDTSTARTString(this.#isAllDay)}`,
        recurringEventId: this.#event.id!,
        start: {
          [this.#dateKey]: startDate?.format(this.#dateFormat),
          timeZone: this.#event.start?.timeZone ?? timezone,
        },
        end: {
          [this.#dateKey]: endDate.format(this.#dateFormat),
          timeZone: this.#event.end?.timeZone ?? timezone,
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
  compassInstances(userId: string): Event_Core[] {
    return this.instances().map((event) => gEventToCompassEvent(event, userId));
  }
}
