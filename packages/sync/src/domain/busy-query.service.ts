import { type ConnectionState } from "@core/types/sync/connection.contracts";
import { type SyncEventCalendarId } from "@core/types/sync/event.contracts";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import {
  type CalendarGeneration,
  type EventOccurrenceRepository,
} from "@sync/storage/repositories/event-occurrence.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

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

// Why a requested calendar's busy data could not be freshly included.
export type CalendarFreshnessIssue =
  // No events resource for the calendar yet — it was never imported.
  | "notImported"
  // A resource exists but has not completed a successful sync yet.
  | "neverSynced"
  // Its last successful sync is older than the caller's acceptable age.
  | "stale";

export interface CalendarIssue {
  calendarId: SyncEventCalendarId;
  reason: CalendarFreshnessIssue;
}

// The freshness evidence for one connection backing a requested calendar. State
// and timestamps are reported as-is so the caller (not Sync) decides how to use
// them; `state === "healthy"` is the only state that permits booking.
export interface ConnectionFreshness {
  connectionId: ConnectionId;
  state: ConnectionState;
  lastSyncedAt: Date | null;
  lastHealthyAt: Date | null;
}

export interface BusyAvailability {
  // Merged busy intervals from every requested calendar that had data (including
  // stale ones — their staleness is disclosed in `issues`, not hidden).
  intervals: BusyInterval[];
  // When this result was computed, so the caller can reason about its own age.
  computedAt: Date;
  // Per-connection freshness for the connections backing the requested calendars.
  connections: ConnectionFreshness[];
  // Every requested calendar was present and within the acceptable age.
  complete: boolean;
  // The calendars that were missing or stale, with the reason for each.
  issues: CalendarIssue[];
  // Fresh enough to confirm a booking: complete AND every backing connection is
  // healthy. Fail-closed — anything unverified makes this false.
  bookable: boolean;
}

export interface BusyAvailabilityDeps {
  occurrences: EventOccurrenceRepository;
  resources: SyncResourceRepository;
  connections: ProviderConnectionRepository;
}

export interface BusyAvailabilityInput {
  tenantId: TenantId;
  principalId: PrincipalId;
  // The blocking calendars whose busy data is requested.
  calendarIds: readonly SyncEventCalendarId[];
  // Half-open query window [start, end).
  start: Date;
  end: Date;
  // The oldest a calendar's last successful sync may be and still count as fresh.
  maxAgeMs: number;
  now: Date;
}

// The busy intervals for a set of calendars plus the freshness/completeness
// evidence a caller needs to decide whether the result is safe to display or to
// confirm a booking against. Sync reports the facts; the booking policy (which
// calendars block, working hours, duration) is the caller's.
//
// A stale calendar's intervals are still returned (with its staleness disclosed)
// rather than dropped, so a display can show what is known while flagging it; a
// booking-confirmation caller sees `complete`/`bookable` go false and fails
// closed rather than booking over possibly-missed conflicts.
export async function computeBusyAvailability(
  deps: BusyAvailabilityDeps,
  input: BusyAvailabilityInput,
): Promise<BusyAvailability> {
  const now = input.now;
  const freshness = await deps.resources.listEventResourceFreshnessByCalendar(
    input.tenantId,
    input.principalId,
    input.calendarIds,
  );

  const present: CalendarGeneration[] = [];
  const issues: CalendarIssue[] = [];
  const backingConnectionIds = new Set<ConnectionId>();

  for (const calendarId of input.calendarIds) {
    const resource = freshness.get(calendarId);
    if (!resource) {
      issues.push({ calendarId, reason: "notImported" });
      continue;
    }
    backingConnectionIds.add(resource.connectionId);
    if (resource.lastSuccessAt === null) {
      issues.push({ calendarId, reason: "neverSynced" });
      continue;
    }
    // Include its data even when stale — disclose the staleness, do not hide it.
    present.push({
      calendarId,
      generation: resource.activeGeneration,
    });
    const ageMs = now.getTime() - resource.lastSuccessAt.getTime();
    if (ageMs > input.maxAgeMs) {
      issues.push({ calendarId, reason: "stale" });
    }
  }

  const intervals = present.length
    ? await queryBusyIntervals(
        { occurrences: deps.occurrences },
        {
          tenantId: input.tenantId,
          principalId: input.principalId,
          calendars: present,
          start: input.start,
          end: input.end,
        },
      )
    : [];

  // Freshness for exactly the connections backing the requested calendars.
  const allConnections = await deps.connections.listByPrincipal(
    input.tenantId,
    input.principalId,
  );
  const connections: ConnectionFreshness[] = allConnections
    .filter((c) => backingConnectionIds.has(c._id))
    .map((c) => ({
      connectionId: c._id,
      state: c.state,
      lastSyncedAt: c.lastSyncedAt,
      lastHealthyAt: c.lastHealthyAt,
    }));

  const complete = issues.length === 0;
  // Every backing connection must be present in storage AND healthy. A missing
  // connection record (referenced by a resource but not found) fails closed.
  const allBackingHealthy =
    connections.length === backingConnectionIds.size &&
    connections.every((c) => c.state === "healthy");
  const bookable = complete && allBackingHealthy;

  return {
    intervals,
    computedAt: now,
    connections,
    complete,
    issues,
    bookable,
  };
}
