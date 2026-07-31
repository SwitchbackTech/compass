import { rrulestr } from "rrule";
import { GCAL_MAX_RECURRENCES } from "@core/constants/core.constants";
import { type DateTime, type EventId } from "@core/types/domain-primitives";
import { type EventSchedule } from "@core/types/event.contracts";
import { type OccurrenceKey } from "@core/types/sync/event.contracts";
import dayjs from "@core/util/date/dayjs";
import { type EventRecord } from "@sync/storage/contracts/event.contracts";
import { type OccurrenceInput } from "@sync/storage/repositories/event-occurrence.repository";

// Derives the bounded occurrence projection for one event. Sync stores masters
// and exceptions canonically and materializes occurrences only for the rolling
// horizon, so this never expands a series to completion — it stops at the
// horizon end (and caps at GCAL_MAX_RECURRENCES as a defensive bound against a
// pathological high-frequency rule).
//
// The projection is per-event: a seriesMaster expands its rule but omits any
// instant an exception owns (passed as `excludedInstants`, the exceptions'
// recurrenceIds); each exception or single event projects its own one
// occurrence under its own id. So no event's projection ever writes another
// event's occurrence rows, and a series edit rebuilds only that event's window.

export interface ProjectionHorizon {
  // Half-open [start, end) over an occurrence's normalized start instant.
  start: Date;
  end: Date;
}

export function projectOccurrences(
  event: EventRecord,
  horizon: ProjectionHorizon,
  excludedInstants: readonly DateTime[] = [],
): OccurrenceInput[] {
  if (event.recurrence.kind === "seriesMaster") {
    return projectSeriesMaster(
      event,
      event.recurrence.rules,
      horizon,
      excludedInstants,
    );
  }

  // A single or exception event is one occurrence at its own schedule. A
  // cancelled exception still projects a row (cancelled) so the gap it carves
  // in the series is visible and reprojection stays deterministic.
  const startAt = scheduleStartAt(event.schedule);
  if (!withinHorizon(startAt, horizon)) return [];
  const cancelled =
    event.recurrence.kind === "exception" && event.recurrence.cancelled;
  return [toOccurrence(event, event.schedule, startAt, cancelled)];
}

function projectSeriesMaster(
  event: EventRecord,
  rules: readonly string[],
  horizon: ProjectionHorizon,
  excludedInstants: readonly DateTime[],
): OccurrenceInput[] {
  const excluded = new Set(
    excludedInstants.map((instant) => new Date(instant).getTime()),
  );
  // EXDATEs are exclusions the provider baked into the rules themselves —
  // same mechanism as exception-owned instants, so they share the set.
  for (const exdate of dateListInstants(rules, "EXDATE", event.schedule)) {
    excluded.add(exdate.getTime());
  }
  const occurrences: OccurrenceInput[] = [];
  // DTSTART is always an instance of the series when it falls in the horizon,
  // even if BYDAY/COUNT would skip it on expansion. Matches CompassEventRRule
  // (and Google): a Friday event saved with weekly BYDAY=SU still materializes
  // that Friday so the create week's range read — and the SPA grid — see it.
  const dtstart = scheduleStartAt(event.schedule);
  const dtstartMs = dtstart.getTime();
  if (withinHorizon(dtstart, horizon) && !excluded.has(dtstartMs)) {
    occurrences.push(toOccurrence(event, event.schedule, dtstart, false));
  }

  // RDATEs are extra instants alongside the rule's expansion; merge, dedupe
  // (an RDATE may restate an expanded instant), sort, and re-cap.
  const expanded = expandInstants(event.schedule, rules, horizon);
  const rdates = dateListInstants(rules, "RDATE", event.schedule).filter(
    (instant) => withinHorizon(instant, horizon),
  );
  const starts = [...new Set([...expanded, ...rdates].map((d) => d.getTime()))]
    .sort((a, b) => a - b)
    .slice(0, GCAL_MAX_RECURRENCES)
    .map((ms) => new Date(ms));

  for (const originalStart of starts) {
    if (excluded.has(originalStart.getTime())) continue;
    // Already emitted as the DTSTART instance above.
    if (originalStart.getTime() === dtstartMs) continue;
    const schedule = shiftSchedule(event.schedule, originalStart);
    occurrences.push(toOccurrence(event, schedule, originalStart, false));
  }

  return occurrences;
}

// Expands a series to its occurrence START instants within the horizon.
// Timed rules expand on floating wall time and re-localize, so a series that
// crosses a DST transition keeps its wall-clock time (matching how the app
// already materializes series). Iteration is bounded by the horizon end and
// the recurrence cap.
function expandInstants(
  schedule: EventSchedule,
  rules: readonly string[],
  horizon: ProjectionHorizon,
): Date[] {
  // Only RRULE lines go to rrulestr, one at a time. Feeding it a multi-line
  // string with EXDATE/RDATE lines flips it onto its RRuleSet branch, which
  // silently IGNORES the dtstart option — the inner RRule then anchors at
  // `new Date()`, re-basing the whole series on "now" at every projection.
  // That resurrected dead series into the present and shifted every
  // occurrenceKey per run, so per-instance delete tombstones never matched.
  // EXDATE/RDATE are handled by dateListInstants in projectSeriesMaster.
  const rruleLines = rules.filter((line) => /^RRULE:/i.test(line));

  const wallInstants: Date[] = [];
  for (const line of rruleLines) {
    const rule = rrulestr(floatingRules([line], schedule), {
      dtstart: floatingAnchor(schedule),
    });
    rule.all((date) => {
      const instant = localizeInstant(date, schedule);
      if (instant.getTime() >= horizon.end.getTime()) return false;
      if (instant.getTime() >= horizon.start.getTime()) wallInstants.push(date);
      return wallInstants.length < GCAL_MAX_RECURRENCES;
    });
  }

  return wallInstants.map((date) => localizeInstant(date, schedule));
}

// Real start instants named by the rules' EXDATE or RDATE lines. Values are
// wall times in the line's TZID (or the event's zone when absent), date-only
// for VALUE=DATE, or real UTC when suffixed Z — each resolves to the same
// real instant localizeInstant produces for an expanded candidate, so they
// compare exactly. A malformed value or unknown zone skips that value only:
// one bad line must never sink a whole projection or import page.
function dateListInstants(
  rules: readonly string[],
  name: "EXDATE" | "RDATE",
  schedule: EventSchedule,
): Date[] {
  const zone = schedule.kind === "timed" ? schedule.timeZone : "UTC";
  const instants: Date[] = [];
  for (const line of rules) {
    const match = /^(EXDATE|RDATE)((?:;[^:]*)?):(.+)$/i.exec(line);
    if (!match || match[1]!.toUpperCase() !== name) continue;
    const params = match[2] ?? "";
    const tzid = /TZID=([^;:]+)/i.exec(params)?.[1];
    for (const raw of match[3]!.split(",")) {
      const value = raw.trim();
      if (/^\d{8}$/.test(value)) {
        instants.push(new Date(`${basicToIso(`${value}T000000`)}Z`));
      } else if (/^\d{8}T\d{6}Z$/.test(value)) {
        instants.push(basicUtcToDate(value.slice(0, -1)));
      } else if (/^\d{8}T\d{6}$/.test(value)) {
        try {
          instants.push(dayjs.tz(basicToIso(value), tzid ?? zone).toDate());
        } catch {
          instants.push(dayjs.tz(basicToIso(value), zone).toDate());
        }
      }
    }
  }
  return instants;
}

// "20260610T055959" → "2026-06-10T05:59:59" (no zone attached).
function basicToIso(basic: string): string {
  return `${basic.slice(0, 4)}-${basic.slice(4, 6)}-${basic.slice(6, 8)}T${basic.slice(9, 11)}:${basic.slice(11, 13)}:${basic.slice(13, 15)}`;
}

// Rewrites a rule's UNTIL into the same floating frame as the dtstart. rrule
// parses UNTIL as an absolute UTC instant (Google always emits ...Z) but
// compares it against the floating candidates we expand from floatingAnchor, so
// a real-UTC UNTIL would mis-bound the series by the zone's offset — projecting
// a phantom trailing occurrence west of UTC, or dropping the true final one east
// of it. Reinterpreting UNTIL's instant as wall time in the event's zone, then
// relabeling it UTC, makes the boundary comparison apples-to-apples. All-day
// series already expand in real UTC, so their UNTIL needs no rewrite.
function floatingRules(
  rules: readonly string[],
  schedule: EventSchedule,
): string {
  const joined = rules.join("\n");
  if (schedule.kind !== "timed") return joined;
  const { timeZone } = schedule;
  return joined.replace(/UNTIL=(\d{8}T\d{6})Z?/g, (_match, basic: string) => {
    const wall = dayjs(basicUtcToDate(basic))
      .tz(timeZone)
      .format("YYYYMMDD[T]HHmmss");
    return `UNTIL=${wall}Z`;
  });
}

// Parses a basic-format UTC datetime ("20260610T055959") to its instant.
function basicUtcToDate(basic: string): Date {
  return new Date(
    Date.UTC(
      Number(basic.slice(0, 4)),
      Number(basic.slice(4, 6)) - 1,
      Number(basic.slice(6, 8)),
      Number(basic.slice(9, 11)),
      Number(basic.slice(11, 13)),
      Number(basic.slice(13, 15)),
    ),
  );
}

// The rule's dtstart: the master's wall-clock start expressed as a naive UTC
// instant, so rrule expands on floating wall time regardless of zone.
function floatingAnchor(schedule: EventSchedule): Date {
  if (schedule.kind === "allDay") {
    return new Date(`${schedule.start}T00:00:00.000Z`);
  }
  const local = dayjs(schedule.start).tz(schedule.timeZone);
  return new Date(
    Date.UTC(
      local.year(),
      local.month(),
      local.date(),
      local.hour(),
      local.minute(),
      local.second(),
    ),
  );
}

// Re-anchors one floating expansion date back onto the real timeline: the
// occurrence's civil wall time in the event's zone (DST-aware). For an all-day
// series the floating date is already the occurrence's midnight-UTC instant.
function localizeInstant(floating: Date, schedule: EventSchedule): Date {
  if (schedule.kind === "allDay") return floating;
  const wall = dayjs(floating).utc().format("YYYY-MM-DDTHH:mm:ss");
  return dayjs.tz(wall, schedule.timeZone).toDate();
}

// Bounds a series' rules to end strictly before an instant, by setting (or
// replacing) UNTIL. The UNTIL is a real-UTC instant, exactly as a provider
// emits it — floatingRules re-frames it on expansion — so a thisAndFollowing
// split truncates the master to just the occurrences before the split point.
export function truncateRulesBefore(
  rules: readonly string[],
  instant: Date,
): string[] {
  // UNTIL is inclusive, so back off one second to end strictly before `instant`
  // (the split occurrence itself is excluded). Sub-second cadence isn't modeled.
  const until = new Date(instant.getTime() - 1000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  // Drop any existing COUNT/UNTIL first: COUNT and UNTIL are mutually exclusive
  // per RFC 5545, and a stale UNTIL would otherwise survive alongside the new one.
  // Only RRULE lines take the bound — appending UNTIL to an EXDATE/RDATE line
  // would corrupt it. (A pre-split EXDATE surviving on both halves is a no-op:
  // an EXDATE naming a non-instant excludes nothing.)
  return stripRuleBounds(rules).map((rule) =>
    /^RRULE:/i.test(rule) ? `${rule};UNTIL=${until}` : rule,
  );
}

// Removes COUNT and UNTIL from each RRULE line (other lines pass through
// untouched), leaving an open-ended pattern. Used to derive the remainder
// series of a thisAndFollowing split (it continues the original cadence from
// the split point, unbounded).
export function stripRuleBounds(rules: readonly string[]): string[] {
  return rules.map((rule) =>
    /^RRULE:/i.test(rule)
      ? rule
          .split(";")
          .filter((part) => !/^COUNT=/i.test(part) && !/^UNTIL=/i.test(part))
          .join(";")
      : rule,
  );
}

// The schedule one occurrence of a series has at a given recurrence instant —
// the master's schedule shifted to that instant, preserving duration and zone.
// Used when materializing an exception event for a scope-"this" edit/delete so
// its instance sits at the right instant.
export function occurrenceScheduleAt(
  masterSchedule: EventSchedule,
  recurrenceId: DateTime,
): EventSchedule {
  return shiftSchedule(masterSchedule, new Date(recurrenceId));
}

// Builds one occurrence's schedule from the master's, at the given original
// start instant, preserving duration and (for timed) the zone.
function shiftSchedule(
  master: EventSchedule,
  originalStart: Date,
): EventSchedule {
  if (master.kind === "allDay") {
    const days = dayOnlyDiff(master.start, master.end);
    const start = dayjs(originalStart).utc();
    return {
      kind: "allDay",
      start: start.format("YYYY-MM-DD"),
      end: start.add(days, "day").format("YYYY-MM-DD"),
    } as EventSchedule;
  }
  const durationMs =
    new Date(master.end).getTime() - new Date(master.start).getTime();
  const start = dayjs(originalStart).tz(master.timeZone);
  return {
    kind: "timed",
    start: start.format(),
    end: start.add(durationMs, "millisecond").format(),
    timeZone: master.timeZone,
  } as EventSchedule;
}

function toOccurrence(
  event: EventRecord,
  schedule: EventSchedule,
  startAt: Date,
  cancelled: boolean,
): OccurrenceInput {
  return {
    tenantId: event.tenantId,
    principalId: event.principalId,
    eventId: event._id,
    occurrenceKey: occurrenceKey(event._id, startAt),
    calendarId: event.calendarId,
    schedule,
    startAt,
    endAt: scheduleEndAt(schedule),
    // Sync's content carries no free/busy transparency yet, so every occurrence
    // is busy. Transparency modeling lands with provider content mapping.
    busy: true,
    title: event.content.title,
    cancelled,
    generation: event.generation,
  };
}

// The normalized start instant used by range queries and the start-time index:
// the timed instant itself, or midnight UTC of an all-day date. Exported so a
// series split can compare its cut point against the master's first occurrence.
export function scheduleStartAt(schedule: EventSchedule): Date {
  if (schedule.kind === "timed") return new Date(schedule.start);
  return new Date(`${schedule.start}T00:00:00.000Z`);
}

// The normalized EXCLUSIVE end instant, paired with scheduleStartAt to form a
// half-open [startAt, endAt) interval on one coherent UTC axis — what a busy /
// overlap query needs (a timed or all-day occurrence starting before a window
// but ending inside it still overlaps it). The all-day end date is already
// exclusive, so midnight UTC of it is the exclusive end. A zero-duration timed
// schedule (start == end, e.g. a reminder) yields startAt === endAt: it never
// satisfies an overlap query, which is correct — it occupies no busy time —
// but it still surfaces via the startAt-only range query used by grid reads.
export function scheduleEndAt(schedule: EventSchedule): Date {
  if (schedule.kind === "timed") return new Date(schedule.end);
  return new Date(`${schedule.end}T00:00:00.000Z`);
}

function withinHorizon(instant: Date, horizon: ProjectionHorizon): boolean {
  return (
    instant.getTime() >= horizon.start.getTime() &&
    instant.getTime() < horizon.end.getTime()
  );
}

function occurrenceKey(eventId: EventId, startAt: Date): OccurrenceKey {
  return `${eventId}:${startAt.toISOString()}` as OccurrenceKey;
}

function dayOnlyDiff(start: string, end: string): number {
  return dayjs(`${end}T00:00:00.000Z`).diff(
    dayjs(`${start}T00:00:00.000Z`),
    "day",
  );
}
