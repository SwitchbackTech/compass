import { ObjectId } from "bson";
import type { Options, RRuleStrOptions } from "rrule";
import { RRule, rrulestr } from "rrule";
import type { ParsedOptions } from "rrule/dist/esm/types";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import type {
  CalendarProvider,
  Schema_Event_Recur_Base,
  Schema_Event_Recur_Instance,
  WithMongoId,
} from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import {
  diffRRuleOptions,
  getCompassEventDateFormat,
  parseCompassEventDate,
} from "@core/util/event/event.util";

export class CompassEventRRule extends RRule {
  #event: WithMongoId<Omit<Schema_Event_Recur_Base, "_id">>;
  #dateFormat: string;
  #durationMs!: number;
  #startDate!: Dayjs;
  #endDate!: Dayjs;

  constructor(
    event: Pick<
      WithMongoId<Omit<Schema_Event_Recur_Base, "_id">>,
      "startDate" | "endDate" | "_id" | "recurrence"
    >,
    options: Partial<Options> = {},
  ) {
    super(CompassEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#dateFormat = getCompassEventDateFormat(this.#event.startDate!);
    this.#startDate = parseCompassEventDate(this.#event.startDate!);
    this.#endDate = parseCompassEventDate(this.#event.endDate!);
    this.#durationMs = this.#endDate.diff(this.#startDate, "milliseconds");
  }

  static #initOptions(
    event: WithMongoId<Omit<Schema_Event_Recur_Base, "_id">>,
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
    const options = { ...rruleOptions, dtstart, tzid };

    if (options.until instanceof Date) {
      options.count = undefined as unknown as number;
    }

    return options;
  }

  private formatUNTIL(rrule: string): string {
    // see - // https://github.com/jkbrzt/rrule/issues/440
    return rrule.replace(/UNTIL=(\d{8}T\d{6}Z?)/, (_match, until: string) => {
      const replace = !until.endsWith("Z");

      return `UNTIL=${replace ? `${until}Z` : until}`;
    });
  }

  private formatCount(rrule: string): string {
    return rrule.replace(/(;COUNT=\d{1,3};?)/, (_match, count: string) => {
      const max = GCAL_MAX_RECURRENCES.toString();
      const replaceLast = count.endsWith(max);
      const replace = count.endsWith(`${max};`);

      if (replace) return ";";

      return replaceLast ? "" : count;
    });
  }

  diffOptions(rrule: CompassEventRRule): Array<[keyof ParsedOptions, unknown]> {
    return diffRRuleOptions(rrule, this);
  }

  toOriginalString(): string {
    return super.toString();
  }

  override toString(): string {
    const untilRule = this.formatUNTIL(super.toString());

    return this.formatCount(untilRule)
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")))
      .join("\n");
  }

  toRecurrence(): string[] {
    const untilRule = this.formatUNTIL(super.toString());

    return this.formatCount(untilRule)
      .split("\n")
      .filter((r) => !(r.startsWith("DTSTART") || r.startsWith("DTEND")));
  }

  override all(
    iterator: (d: Date, len: number) => boolean = (_, index) =>
      index < GCAL_MAX_RECURRENCES,
  ): Date[] {
    const tzid = dayjs.tz.guess();
    const dates = super.all(iterator);
    const firstInstance = dates[0]!;
    const firstInstanceStartDate = dayjs(firstInstance).tz(tzid);
    const includesDtStart = this.#startDate.isSame(firstInstanceStartDate);
    const rDates = includesDtStart ? [] : [this.#startDate.toDate()];

    return rDates.concat(dates);
  }

  base(
    provider?: CalendarProvider,
  ): WithMongoId<Omit<Schema_Event_Recur_Base, "_id">> {
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
  ): WithMongoId<Omit<Schema_Event_Recur_Instance, "_id">>[] {
    const base = this.base();
    const tzid = dayjs.tz.guess();
    const baseData = MapEvent.removeIdentifyingData(base);
    const baseEventId = base._id.toString();

    return this.all().map((date) => {
      const _id = new ObjectId();
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
