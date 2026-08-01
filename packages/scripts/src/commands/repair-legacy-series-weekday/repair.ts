import { type Db, type MongoClient } from "mongodb";
import { type DateTime } from "@core/types/domain-primitives";
import dayjs from "@core/util/date/dayjs";
import { reprojectMaster } from "@sync/domain/series-exception";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import {
  type EventRecord,
  EventRecordSchema,
} from "@sync/storage/contracts/event.contracts";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";

// RRULE weekday letters, dayjs .day() order (0 = Sunday).
const RRULE_WEEKDAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;

export interface SeriesRepairEntry {
  seriesId: string;
  tenantId: string;
  currentByDay: string;
  targetByDay: string | null;
  consensusShare: number | null;
  scheduleStartShifted: boolean;
  exceptionsSampled: number;
  outcome:
    | "fixed"
    | "already-correct"
    | "skipped-ambiguous"
    | "skipped-no-exceptions";
}

export interface RepairReport {
  generatedAt: string;
  dryRun: boolean;
  scanned: number;
  candidatesConsidered: number;
  fixed: number;
  skipped: number;
  entries: SeriesRepairEntry[];
}

// A weekly rule with exactly one BYDAY value — the shape this repair targets.
// Multi-day (`BYDAY=MO,WE,FR`) or non-weekly rules are structurally immune to
// the single-frame-mismatch bug this fixes (see legacy-utc-frame-series-
// duplicates memory) and are left untouched.
function singleByDayRule(rules: readonly string[]): {
  rule: string;
  byDay: string;
} | null {
  for (const rule of rules) {
    if (!/FREQ=WEEKLY/.test(rule)) continue;
    const match = /BYDAY=([A-Z]{2})(?:;|$)/.exec(rule);
    if (!match) continue;
    if (/BYDAY=[A-Z]{2},/.test(rule)) continue; // multi-day, skip
    return { rule, byDay: match[1] as string };
  }
  return null;
}

function replaceByDay(rule: string, targetByDay: string): string {
  return rule.replace(/BYDAY=[A-Z]{2}(,[A-Z]{2})*/, `BYDAY=${targetByDay}`);
}

// A single legacy-migrated series can span many years and hold a handful of
// genuine one-off reschedules (the user moved that one week) alongside
// hundreds of otherwise-consistent occurrences — Tyler's own "Review Week"
// series is 711 of 712 exceptions on Saturday, 1 on Sunday. Requiring literal
// unanimity would wrongly skip exactly this, the clearest and most confident
// case. A strong-majority mode is the right bar: high enough to reject
// genuinely mixed/ambiguous history, low enough not to be defeated by rare,
// legitimate outliers.
const CONSENSUS_SHARE_THRESHOLD = 0.8;

// The exceptions' consensus weekday (in the master's own schedule.timeZone),
// derived from their own schedule.start — the real, Google-sourced instant —
// not their recurrenceId (which is expressed in the master's, possibly wrong,
// frame). Returns null if there are no non-cancelled exceptions to learn
// from, or if no single weekday commands a strong majority (ambiguous
// history: don't guess).
function consensusByDay(
  exceptions: readonly EventRecord[],
  timeZone: string,
): { byDay: string; sampled: number; share: number } | null {
  const live = exceptions.filter(
    (e) => e.recurrence.kind === "exception" && !e.recurrence.cancelled,
  );
  if (live.length === 0) return null;

  const counts = new Map<number, number>();
  for (const e of live) {
    const start = e.schedule.kind === "timed" ? e.schedule.start : null;
    if (!start) continue;
    const weekday = dayjs(start).tz(timeZone).day();
    counts.set(weekday, (counts.get(weekday) ?? 0) + 1);
  }
  if (counts.size === 0) return null;

  const [modeWeekday, modeCount] = [...counts.entries()].sort(
    (a, b) => b[1] - a[1],
  )[0] as [number, number];
  const share = modeCount / live.length;
  if (share < CONSENSUS_SHARE_THRESHOLD) return null;

  return { byDay: RRULE_WEEKDAYS[modeWeekday]!, sampled: live.length, share };
}

// Smallest day-count shift (positive or negative) that moves `fromWeekday`
// onto `toWeekday`, e.g. Sun(0) -> Sat(6) is -1, not +6.
function weekdayShiftDays(fromWeekday: number, toWeekday: number): number {
  const forward = (toWeekday - fromWeekday + 7) % 7;
  return forward <= 3 ? forward : forward - 7;
}

export async function repairLegacySeriesWeekday(
  db: Db,
  client: MongoClient,
  options: { dryRun: boolean } = { dryRun: true },
): Promise<RepairReport> {
  const { dryRun } = options;
  const events = new EventRepository(db);
  const occurrences = new EventOccurrenceRepository(db, client);

  const cursor = db.collection(SYNC_COLLECTIONS.events).find({
    "recurrence.kind": "seriesMaster",
    lifecycleState: "active",
    "schedule.kind": "timed",
  });

  let scanned = 0;
  let candidatesConsidered = 0;
  let fixed = 0;
  let skipped = 0;
  const entries: SeriesRepairEntry[] = [];

  for await (const doc of cursor) {
    scanned += 1;
    const master = EventRecordSchema.parse(doc);
    if (master.recurrence.kind !== "seriesMaster") continue;
    if (master.schedule.kind !== "timed") continue;

    const found = singleByDayRule(master.recurrence.rules);
    if (!found) continue;
    candidatesConsidered += 1;

    const exceptions = await events.findSeriesExceptions(
      master.tenantId,
      master.principalId,
      master._id,
    );
    const consensus = consensusByDay(exceptions, master.schedule.timeZone);

    if (!consensus) {
      const outcome =
        exceptions.length === 0 ? "skipped-no-exceptions" : "skipped-ambiguous";
      skipped += 1;
      entries.push({
        seriesId: master._id,
        tenantId: master.tenantId,
        currentByDay: found.byDay,
        targetByDay: null,
        consensusShare: null,
        scheduleStartShifted: false,
        exceptionsSampled: exceptions.length,
        outcome,
      });
      continue;
    }

    if (consensus.byDay === found.byDay) {
      entries.push({
        seriesId: master._id,
        tenantId: master.tenantId,
        currentByDay: found.byDay,
        targetByDay: consensus.byDay,
        consensusShare: consensus.share,
        scheduleStartShifted: false,
        exceptionsSampled: consensus.sampled,
        outcome: "already-correct",
      });
      continue;
    }

    const targetWeekdayIndex = RRULE_WEEKDAYS.indexOf(
      consensus.byDay as (typeof RRULE_WEEKDAYS)[number],
    );
    const currentStart = dayjs(master.schedule.start).tz(
      master.schedule.timeZone,
    );
    const dtstartAlreadyExcepted = exceptions.some(
      (e) =>
        e.recurrence.kind === "exception" &&
        new Date(e.recurrence.recurrenceId).getTime() ===
          new Date(master.schedule.start).getTime(),
    );
    const dtstartNeedsShift =
      !dtstartAlreadyExcepted && currentStart.day() !== targetWeekdayIndex;

    const nextRules = master.recurrence.rules.map((rule) =>
      rule === found.rule ? replaceByDay(rule, consensus.byDay) : rule,
    );

    let nextSchedule = master.schedule;
    if (dtstartNeedsShift) {
      const shiftDays = weekdayShiftDays(
        currentStart.day(),
        targetWeekdayIndex,
      );
      const shiftedStart = currentStart.add(shiftDays, "day");
      const shiftedEnd = dayjs(master.schedule.end)
        .tz(master.schedule.timeZone)
        .add(shiftDays, "day");
      nextSchedule = {
        ...master.schedule,
        start: shiftedStart.format() as DateTime,
        end: shiftedEnd.format() as DateTime,
      };
    }

    const nextMaster: EventRecord = {
      ...master,
      recurrence: { ...master.recurrence, rules: nextRules },
      schedule: nextSchedule,
      updatedAt: new Date(),
    };

    if (!dryRun) {
      const matched = await events.replaceExisting(nextMaster);
      if (matched) {
        await reprojectMaster(
          { events, occurrences },
          { tenantId: master.tenantId, principalId: master.principalId },
          nextMaster,
          () => new Date(),
        );
      }
    }

    fixed += 1;
    entries.push({
      seriesId: master._id,
      tenantId: master.tenantId,
      currentByDay: found.byDay,
      targetByDay: consensus.byDay,
      consensusShare: consensus.share,
      scheduleStartShifted: dtstartNeedsShift,
      exceptionsSampled: consensus.sampled,
      outcome: "fixed",
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun,
    scanned,
    candidatesConsidered,
    fixed,
    skipped,
    entries,
  };
}
