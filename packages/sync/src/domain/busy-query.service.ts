import {
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  type CalendarGeneration,
  type EventOccurrenceRepository,
} from "@sync/storage/repositories/event-occurrence.repository";

// A normalized, half-open [start, end) busy interval on the UTC instant axis.
export interface BusyInterval {
  start: Date;
  end: Date;
}

// Merge half-open [start, end) intervals into the minimal set of
// non-overlapping, non-adjacent intervals, sorted by start. Overlapping AND
// touching intervals merge — [9,10) and [10,11) leave no free gap between them,
// so availability must treat them as one busy block [9,11). Empty intervals
// (start >= end) contribute no busy time and are dropped. Pure and input-order
// independent.
export function mergeBusyIntervals(
  intervals: readonly BusyInterval[],
): BusyInterval[] {
  const sorted = intervals
    .filter((i) => i.end.getTime() > i.start.getTime())
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.end.getTime() - b.end.getTime(),
    );

  const merged: BusyInterval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start.getTime() <= last.end.getTime()) {
      // Overlapping or touching: extend the open block if this one reaches
      // further (a fully-nested interval leaves the end unchanged).
      if (current.end.getTime() > last.end.getTime()) last.end = current.end;
    } else {
      merged.push({ start: current.start, end: current.end });
    }
  }
  return merged;
}

export interface BusyQueryDeps {
  occurrences: EventOccurrenceRepository;
}

export interface BusyQueryInput {
  tenantId: TenantId;
  principalId: PrincipalId;
  // The blocking calendars, each with the generation whose occurrences are live.
  calendars: readonly CalendarGeneration[];
  // Half-open query window [start, end).
  start: Date;
  end: Date;
}

// The merged busy intervals within [start, end) for the given calendars. Each
// occurrence interval is clamped to the window before merging, so an event that
// spills past either edge contributes only its in-window busy time. This returns
// intervals only; freshness/completeness/bookability evidence is layered on by a
// later slice.
export async function queryBusyIntervals(
  deps: BusyQueryDeps,
  input: BusyQueryInput,
): Promise<BusyInterval[]> {
  const occurrences = await deps.occurrences.listBusyOverlapping({
    tenantId: input.tenantId,
    principalId: input.principalId,
    calendars: input.calendars,
    start: input.start,
    end: input.end,
  });

  const windowStart = input.start.getTime();
  const windowEnd = input.end.getTime();
  const clamped = occurrences.map((o) => ({
    start: o.startAt.getTime() > windowStart ? o.startAt : input.start,
    end: o.endAt.getTime() < windowEnd ? o.endAt : input.end,
  }));

  return mergeBusyIntervals(clamped);
}
