import { ObjectId } from "bson";
import { type Options, RRule, type RRuleStrOptions, rrulestr } from "rrule";
import { type ParsedOptions } from "rrule/dist/esm/types";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { MapEvent } from "@core/mappers/map.event";
import { type CalendarProvider } from "@core/types/calendar.types";
import {
  type BaseEvent,
  type InstanceEvent,
} from "@core/types/compass-event.contracts";
import { type WithObjectId } from "@core/types/type.utils";
import dayjs, { type Dayjs } from "@core/util/date/dayjs";
import {
  diffRRuleOptions,
  getCompassEventDateFormat,
} from "@core/util/event/event.util";

// rrule expands BYDAY/BYMONTHDAY/etc. against dtstart's UTC calendar fields.
// For a timed event, dtstart must be "floating" - its UTC fields holding the
// event's own wall-clock time - or every candidate shifts by the timezone
// offset. A 7pm Denver Thursday's real instant is 1am UTC the *next* day, so
// BYDAY=SA would expand to real-Saturday-1am-UTC, which renders as Friday
// 7pm in Denver - the exact draft-preview bug this fixes. rrule's own `tzid`
// option looks like the fix but isn't: it re-projects onto the *host*
// machine's zone, which only cancels out when the host and event zone
// happen to match (see packages/sync/src/domain/occurrence-projection.ts's
// floatingAnchor/localizeInstant, which this mirrors). All-day dates have no
// time component, so they're already floating and need no conversion.
function toFloatingDate(wall: Dayjs): Date {
  return new Date(
    Date.UTC(
      wall.year(),
      wall.month(),
      wall.date(),
      wall.hour(),
      wall.minute(),
      wall.second(),
      wall.millisecond(),
    ),
  );
}

// The inverse: re-anchors a floating date (UTC fields = wall clock) back onto
// the real timeline as the civil wall time in `timezone` (DST-aware).
// Exported so callers that read `.options.until` off a constructed
// CompassEventRRule (e.g. useRecurrence, to seed editable state) can undo the
// float before feeding the value back into a new instance - otherwise
// #initOptions floats an already-floating Date a second time, drifting it by
// the timezone offset on every round trip.
export function localizeFloatingDate(floating: Date, timezone: string): Date {
  const wall = dayjs.utc(floating).format("YYYY-MM-DDTHH:mm:ss.SSS");

  return dayjs.tz(wall, timezone).toDate();
}

export class CompassEventRRule extends RRule {
  #event: WithObjectId<Omit<BaseEvent, "_id">>;
  #dateFormat: string;
  #durationMs!: number;
  #startDate!: Dayjs;
  #endDate!: Dayjs;
  #timezone!: string;
  #isTimed!: boolean;

  constructor(
    event: Pick<
      WithObjectId<Omit<BaseEvent, "_id">>,
      "startDate" | "endDate" | "_id" | "recurrence"
    >,
    options: Partial<Options> = {},
  ) {
    super(CompassEventRRule.#initOptions(event, options));

    this.#event = event;
    this.#dateFormat = getCompassEventDateFormat(this.#event.startDate!);
    // Defaults to the guessed timezone, same as before; `options.tzid` is
    // otherwise unused in production and exists so tests can pin the
    // expansion frame independently of the machine's own timezone.
    this.#timezone = options.tzid ?? dayjs.tz.guess();
    this.#isTimed = this.#dateFormat !== dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;
    // Not parseCompassEventDate: that hardcodes dayjs.tz.guess(), which would
    // ignore an injected options.tzid and desync from #initOptions below.
    this.#startDate = dayjs(this.#event.startDate!, this.#dateFormat).tz(
      this.#timezone,
    );
    this.#endDate = dayjs(
      this.#event.endDate!,
      getCompassEventDateFormat(this.#event.endDate!),
    ).tz(this.#timezone);
    this.#durationMs = this.#endDate.diff(this.#startDate, "milliseconds");
  }

  // `this.options.until` (inherited from RRule) is the internal floating
  // value used for candidate expansion - not a real instant. This is the
  // outbound counterpart to #initOptions' inbound floating: it un-floats
  // before handing `until` to a caller, the same way `all()` already
  // un-floats its returned dates, so round-tripping this value back into a
  // new CompassEventRRule's `options.until` is idempotent by construction.
  get until(): Date | null {
    const until = this.options.until;
    if (!until) return null;

    return this.#isTimed ? localizeFloatingDate(until, this.#timezone) : until;
  }

  static #initOptions(
    event: WithObjectId<Omit<BaseEvent, "_id">>,
    _options: Partial<Options> = {},
  ): Partial<Options> {
    const timezone = _options.tzid ?? dayjs.tz.guess();
    const format = getCompassEventDateFormat(event.startDate!);
    const isTimed = format !== dayjs.DateFormat.YEAR_MONTH_DAY_FORMAT;
    const startDate = dayjs(event.startDate!, format).tz(timezone);
    const dtstart = isTimed
      ? toFloatingDate(startDate)
      : startDate.local().toDate();

    const opts: Partial<RRuleStrOptions> = { dtstart };
    // Only the RRULE line goes to rrulestr: with EXDATE/RDATE lines present it
    // returns an RRuleSet, whose origOptions is {} — silently discarding the
    // whole pattern (and the dtstart option). The client only expands the
    // rule; EXDATE gaps come from server-projected occurrences (see
    // packages/sync/src/domain/occurrence-projection.ts).
    const recurrence = event.recurrence?.rule
      ?.filter((line) => /^RRULE:/i.test(line))
      .join("\n")
      .trim();
    const valid = (recurrence?.length ?? 0) > 0;
    const rruleSet = valid ? rrulestr(recurrence, opts) : { origOptions: {} };
    const rruleOptions = { ...rruleSet.origOptions, ..._options };
    const options = { ...rruleOptions, dtstart };
    delete options.tzid;

    if (options.until instanceof Date) {
      // UNTIL is a real UTC instant (parsed from the rule string's trailing
      // "Z", or passed in directly) - re-express it in the same floating
      // frame as dtstart, or rrule's internal until-vs-candidate comparison
      // is off by the timezone offset (mirrors packages/sync's
      // floatingRules).
      options.until = isTimed
        ? toFloatingDate(dayjs(options.until).tz(timezone))
        : options.until;
      options.count = undefined as unknown as number;
    }

    return options;
  }

  private formatUNTIL(rrule: string): string {
    if (!this.#isTimed) {
      // see - // https://github.com/jkbrzt/rrule/issues/440
      return rrule.replace(/UNTIL=(\d{8}T\d{6}Z?)/, (_match, until: string) => {
        const replace = !until.endsWith("Z");

        return `UNTIL=${replace ? `${until}Z` : until}`;
      });
    }

    return rrule.replace(/UNTIL=(\d{8}T\d{6})Z?/, (_match, basic: string) => {
      // `basic` is the floating frame's wall-clock digits (see
      // #initOptions); reinterpret them as wall time in this rule's
      // timezone and convert to the real UTC instant, so the persisted
      // rule's UNTIL means what it did when it was parsed in - not the
      // floating stand-in used internally for expansion.
      const real = dayjs
        .tz(basic, "YYYYMMDD[T]HHmmss", this.#timezone)
        .utc()
        .format("YYYYMMDD[T]HHmmss[Z]");

      return `UNTIL=${real}`;
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
    // Candidates from rrule are in the floating frame for timed events (see
    // #initOptions) - identity for all-day. Both the caller's iterator and
    // the returned dates need real instants.
    const localize = (d: Date) =>
      this.#isTimed ? localizeFloatingDate(d, this.#timezone) : d;
    const dates = super
      .all((floating, index) => iterator(localize(floating), index))
      .map(localize);
    const firstInstance = dates[0];
    const firstInstanceStartDate = dayjs(firstInstance).tz(this.#timezone);
    const includesDtStart = this.#startDate.isSame(firstInstanceStartDate);
    const rDates = includesDtStart ? [] : [this.#startDate.toDate()];

    return rDates.concat(dates);
  }

  base(provider?: CalendarProvider): WithObjectId<Omit<BaseEvent, "_id">> {
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
  ): WithObjectId<Omit<InstanceEvent, "_id">>[] {
    const base = this.base();
    const baseData = MapEvent.removeIdentifyingData(base);
    const baseEventId = base._id.toString();

    return this.all().map((date) => {
      const _id = new ObjectId();
      const _startDate = dayjs(date).tz(this.#timezone);
      const _endDate = _startDate.add(this.#durationMs, "milliseconds");
      const startDate = _startDate.format(this.#dateFormat);
      const endDate = _endDate.format(this.#dateFormat);
      const recurrence = { eventId: baseEventId };
      const instance = { ...baseData, _id, startDate, endDate, recurrence };
      const providerData = MapEvent.toProviderData(instance, provider, base);

      return { ...instance, ...providerData };
    });
  }
}
