import { ObjectId } from "bson";
import type { Options, RRuleStrOptions } from "rrule";
import { RRule, rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import {
  type Schema_Base_Event,
  Schema_Event,
  type Schema_Instance_Event,
} from "@core/types/event.types";
import dayjs, { Dayjs } from "@core/util/date/dayjs";

export class CompassEventRRule extends RRule {
  #event: Schema_Event;
  #durationMs!: number;
  #startDate!: Dayjs;
  #endDate!: Dayjs;

  constructor(event: Schema_Event, options: Partial<Options> = {}) {
    super(CompassEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#startDate = dayjs(this.#event.startDate);
    this.#endDate = dayjs(this.#event.endDate);
    this.#durationMs = this.#endDate.diff(this.#startDate, "milliseconds");
  }

  static #initOptions(
    event: Schema_Event,
    _options: Partial<Options> = {},
  ): Partial<Options> {
    const dtstart = event.startDate;
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
    const dates = super.all(iterator);
    const firstInstance = dates[0];
    const firstInstanceStartDate = dayjs(firstInstance);
    const includesDtStart = this.#startDate.isSame(firstInstanceStartDate);
    const rDates = includesDtStart ? [] : [this.#startDate.toDate()];

    return rDates.concat(dates);
  }

  base(): Schema_Base_Event {
    const recurrence = { rule: this.toRecurrence(), eventId: this.#event._id };

    return { ...this.#event, recurrence };
  }

  /**
   * instances
   *
   * @memberof CompassEventRRule
   * @description Returns all instances of the event based on the recurrence rule.
   */
  instances(): Schema_Instance_Event[] {
    const base = this.base();
    const { metadata } = base;
    const appendProviderData = metadata && "id" in metadata;

    return this.all().map((date) => {
      const _id = new ObjectId();
      const _startDate = dayjs(date);
      const _endDate = _startDate.add(this.#durationMs, "milliseconds");
      const startDate = _startDate.toDate();
      const endDate = _endDate.toDate();
      const order = 0;
      const recurrence = { rule: this.toRecurrence(), eventId: base._id };
      const instance: Schema_Instance_Event = {
        _id,
        startDate,
        endDate,
        originalStartDate: startDate,
        order,
        recurrence,
        calendar: base.calendar,
        title: base.title,
        description: base.description,
        isSomeday: base.isSomeday,
        origin: base.origin,
        priority: base.priority,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt,
      };

      if (appendProviderData) {
        instance.metadata = MapEvent.toProviderMetadata(instance, metadata.id);
      }

      return instance;
    });
  }
}
