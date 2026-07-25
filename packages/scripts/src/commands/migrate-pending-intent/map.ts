import {
  toSyncContent,
  toSyncSchedule,
} from "@scripts/commands/migrate-provider-state/map";
import { type ObjectId } from "mongodb";
import { type EventId, EventIdSchema } from "@core/types/domain-primitives";
import { type EditableRecurrence } from "@core/types/event.contracts";
import {
  type SyncEventContent,
  type SyncEventRecurrence,
} from "@core/types/sync/event.contracts";
import {
  IdempotencyKeySchema,
  type PrincipalId,
  type ProviderCalendarId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { type EventRecord as LegacyEventRecord } from "@backend/event/event.record";
import { syncHorizon } from "@sync/domain/horizon";
import { type CommandSubmit } from "@sync/storage/contracts/command.contracts";
import { type EventRecord as SyncEventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";

export { toSyncContent, toSyncSchedule };

export function byHexId(a: { _id: ObjectId }, b: { _id: ObjectId }): number {
  return a._id.toHexString().localeCompare(b._id.toHexString());
}

export function backfillIdempotencyKey(eventId: string) {
  return IdempotencyKeySchema.parse(`create:${eventId}`);
}

export function toSyncRecurrence(
  recurrence: LegacyEventRecord["recurrence"],
): SyncEventRecurrence | null {
  if (recurrence.kind === "single") return { kind: "single" };
  if (recurrence.kind === "series") {
    return { kind: "seriesMaster", rules: recurrence.rules };
  }
  return null;
}

export function toEditableRecurrence(
  recurrence: SyncEventRecurrence,
): EditableRecurrence | null {
  if (recurrence.kind === "single") return { kind: "single" };
  if (recurrence.kind === "seriesMaster") {
    return { kind: "series", rules: recurrence.rules };
  }
  return null;
}

export function isWithinSyncHorizon(
  schedule: ReturnType<typeof toSyncSchedule>,
  now: Date,
): boolean {
  const horizon = syncHorizon(now);
  const startMs =
    schedule.kind === "timed"
      ? Date.parse(schedule.start)
      : Date.parse(`${schedule.start}T00:00:00.000Z`);
  if (!Number.isFinite(startMs)) return false;
  return startMs >= horizon.start.getTime() && startMs < horizon.end.getTime();
}

export function buildUnlinkedEventRecord(args: {
  event: LegacyEventRecord;
  tenantId: TenantId;
  principalId: PrincipalId;
  content: SyncEventContent;
  schedule: ReturnType<typeof toSyncSchedule>;
  recurrence: SyncEventRecurrence;
  now: Date;
  existing: SyncEventRecord | null;
}): SyncEventRecord {
  const eventId = EventIdSchema.parse(args.event._id.toHexString());
  return {
    _id: eventId,
    tenantId: args.tenantId,
    principalId: args.principalId,
    origin: "compass",
    calendarId: args.event.calendarId.toHexString() as never,
    clientEventId: null,
    connectionId: null,
    providerEventId: null,
    providerVersion: null,
    providerUpdatedAt: null,
    deliveryState: null,
    providerMetadata: null,
    content: args.content,
    schedule: args.schedule,
    recurrence: args.recurrence,
    lifecycleState: "active",
    generation: args.existing?.generation ?? 0,
    createdAt: args.existing?.createdAt ?? args.event.createdAt,
    updatedAt: args.now,
    confirmedAt: args.now,
  };
}

export function buildBackfillCommandSubmit(args: {
  tenantId: TenantId;
  principalId: PrincipalId;
  eventId: EventId;
  targetCalendarId: ProviderCalendarId;
  content: SyncEventContent;
  schedule: ReturnType<typeof toSyncSchedule>;
  editableRecurrence: EditableRecurrence;
}): CommandSubmit {
  return {
    tenantId: args.tenantId,
    principalId: args.principalId,
    idempotencyKey: backfillIdempotencyKey(args.eventId),
    eventId: args.eventId,
    expectedVersion: null,
    input: {
      kind: "create",
      calendarId: args.targetCalendarId,
      clientEventId: null,
      invitation: "none",
      content: args.content,
      schedule: args.schedule,
      recurrence: args.editableRecurrence,
    },
  };
}

/** Prefer primary writable; never use email. Deterministic by `_id`. */
export function selectBackfillTarget(
  calendars: readonly ProviderCalendarRecord[],
  options: {
    targetCalendarId?: string;
    targetGcalId?: string;
  },
):
  | { ok: true; calendar: ProviderCalendarRecord }
  | { ok: false; reason: "missing" | "not_owned" | "read_only" } {
  const writable = [...calendars]
    .filter((c) => c.active && c.capabilities.canWriteEvents)
    .sort((a, b) => a._id.localeCompare(b._id));

  if (options.targetCalendarId) {
    const match = calendars.find((c) => c._id === options.targetCalendarId);
    if (!match) return { ok: false, reason: "not_owned" };
    if (!match.active || !match.capabilities.canWriteEvents) {
      return { ok: false, reason: "read_only" };
    }
    return { ok: true, calendar: match };
  }

  if (options.targetGcalId) {
    const match = writable.find(
      (c) => c.providerCalendarId === options.targetGcalId,
    );
    if (!match) return { ok: false, reason: "missing" };
    return { ok: true, calendar: match };
  }

  const primary = writable.find((c) => c.primary);
  if (primary) return { ok: true, calendar: primary };
  if (writable[0]) return { ok: true, calendar: writable[0] };
  return { ok: false, reason: "missing" };
}
