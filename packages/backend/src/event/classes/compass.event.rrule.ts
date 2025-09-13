import { ObjectId, WithId } from "mongodb";
import { Options, RRule, RRuleStrOptions, rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  CalendarProvider,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
} from "@core/types/event.types";
import dayjs from "@core/util/date/dayjs";
import {
  getCompassEventDateFormat,
  parseCompassEventDate,
} from "@core/util/event/event.util";

export class CompassEventRRule extends RRule {
  #event: WithId<Omit<Schema_Event_Recur_Base, "_id">>;
  #dateFormat: string;
  #durationMs!: number;

  constructor(
    event: WithId<Omit<Schema_Event_Recur_Base, "_id">>,
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
    event: WithId<Omit<Schema_Event_Recur_Base, "_id">>,
    _options: Partial<Options> = {},
  ): Partial<Options> {
    const startDate = parseCompassEventDate(event.startDate!);
    const dtstart = startDate.local().toDate();
    const tzid = dayjs.tz.guess();
    const opts: Partial<RRuleStrOptions> = { dtstart, tzid };
    const recurrence = event.recurrence?.rule?.join("\n").trim();
    const valid = (recurrence?.length ?? 0) > 0;
    const rruleSet = valid ? rrulestr(recurrence!, opts) : { origOptions: {} };
    const rruleOptions = { ...rruleSet.origOptions, ..._options };
    const rawCount = rruleOptions.count ?? GCAL_MAX_RECURRENCES;
    const count = Math.min(rawCount, GCAL_MAX_RECURRENCES);
    const options = { ...rruleOptions, count, dtstart, tzid };

    if (options.until instanceof Date) {
      options.count = undefined as unknown as number;
    }

    return options;
  }

  private formatUNTIL(rrule: string): string {
    // see - // https://github.com/jkbrzt/rrule/issues/440
    return rrule.replace(/UNTIL=(\d{8}T\d{6}Z?)/, (_match, until) => {
      const replace = !until.endsWith("Z");

      return `UNTIL=${replace ? `${until}Z` : until}`;
    });
  }

  toString(): string {
    return this.formatUNTIL(super.toString())
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")))
      .join("\n");
  }

  toRecurrence(): string[] {
    const untilRule = this.formatUNTIL(super.toString());

    return untilRule
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")));
  }

  base(
    provider?: CalendarProvider,
  ): WithId<Omit<Schema_Event_Recur_Base, "_id">> {
    const _id = this.#event._id ?? new ObjectId();
    const recurrence = { rule: this.toRecurrence() };
    const event = { ...this.#event, _id, recurrence };
    const providerData = MapEvent.toProviderData(event, provider);

    return { ...event, ...providerData };
  }

  /**
   * instances
   *
   * @memberof GcalEventRRule
   * @description Returns all instances of the event based on the recurrence rule.
   * @note **This is a test-only method for now, it is not to be used in production.**
   */
  instances(
    provider?: CalendarProvider,
  ): WithId<Omit<Schema_Event_Recur_Instance, "_id">>[] {
    const base = this.base();
    const baseData = MapEvent.removeIdentifyingData(base);
    const baseEventId = base._id.toString();

    return this.all().map((date) => {
      const _id = new ObjectId();
      const tzid = dayjs.tz.guess();
      const _startDate = dayjs(date).tz(tzid);
      const _endDate = _startDate.add(this.#durationMs, "milliseconds");
      const startDate = _startDate.format(this.#dateFormat);
      const endDate = _endDate.format(this.#dateFormat);
      const recurrence = { eventId: baseEventId };
      const instance = { ...baseData, _id, startDate, endDate, recurrence };
      const providerData = MapEvent.toProviderData(instance, provider!, base);

      return { ...instance, ...providerData };
    });
  }
}
