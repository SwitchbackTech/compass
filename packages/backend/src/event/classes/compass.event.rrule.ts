import { ObjectId, WithId } from "mongodb";
import { Options, RRule, RRuleStrOptions, rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import {
  Schema_Event,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  getCompassEventDateFormat,
  parseCompassEventDate,
} from "@core/util/event/event.util";

export class CompassEventRRule extends RRule {
  #event: WithId<Omit<Schema_Event, "_id">>;
  #dateFormat: string;
  #durationMs!: number;

  constructor(
    event: WithId<Omit<Schema_Event, "_id">>,
    options: Partial<Options> = {},
  ) {
    super(CompassEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#dateFormat = getCompassEventDateFormat(this.#event.startDate!);

    const startDate = parseCompassEventDate(this.#event.startDate!);
    const endDate = parseCompassEventDate(this.#event.endDate!);

    this.#durationMs = endDate.diff(startDate, "milliseconds");
  }

  static #initOptions(
    event: WithId<Omit<Schema_Event, "_id">>,
    options: Partial<Options> = {},
  ): Partial<Options> {
    const startDate = parseCompassEventDate(event.startDate!);
    const dtstart = startDate.local().toDate();
    const tzid = dayjs.tz.guess();
    const opts: Partial<RRuleStrOptions> = { dtstart, tzid };
    const recurrence = event.recurrence?.rule?.join("\n").trim();
    const valid = (recurrence?.length ?? 0) > 0;
    const rruleSet = valid ? rrulestr(recurrence!, opts) : { origOptions: {} };
    const rruleOptions = { ...rruleSet.origOptions, ...options };
    const rawCount = rruleOptions.count ?? GCAL_MAX_RECURRENCES;
    const count = Math.min(rawCount, GCAL_MAX_RECURRENCES);

    return { ...rruleOptions, count, dtstart, tzid };
  }

  toString(): string {
    return super
      .toString()
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")))
      .join("\n");
  }

  toRecurrence(): string[] {
    return super
      .toString()
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")));
  }

  base(): WithId<Omit<Schema_Event, "_id">> {
    return {
      ...this.#event,
      _id: this.#event._id ?? new ObjectId(),
      recurrence: { rule: this.toRecurrence() },
    };
  }

  /**
   * instances
   *
   * @memberof GcalEventRRule
   * @description Returns all instances of the event based on the recurrence rule.
   * @note **This is a test-only method for now, it is not to be used in production.**
   */
  instances(): WithId<Omit<Schema_Event_Recur_Instance, "_id">>[] {
    return this.all().map((date) => {
      const timezone = dayjs.tz.guess();
      const startDate = dayjs(date).tz(timezone);
      const endDate = startDate.add(this.#durationMs, "milliseconds");
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { order, allDayOrder, ...baseData } = this.#event;

      return {
        ...baseData,
        _id: new ObjectId(),
        startDate: startDate.format(this.#dateFormat),
        endDate: endDate.format(this.#dateFormat),
        recurrence: { eventId: this.base()._id.toString() },
      };
    });
  }
}
