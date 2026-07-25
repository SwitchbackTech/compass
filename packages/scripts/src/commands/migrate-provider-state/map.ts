import { type ObjectId } from "mongodb";
import { type CalendarAccess } from "@core/types/calendar.contracts";
import {
  type DateOnly,
  type DateTime,
  DateTimeSchema,
  EventIdSchema,
} from "@core/types/domain-primitives";
import { type EventSchedule } from "@core/types/event.contracts";
import {
  type CalendarAccessRole,
  type CalendarCapabilities,
} from "@core/types/sync/connection.contracts";
import {
  type ProviderEventVersion,
  ProviderEventVersionSchema,
  type SyncEventContent,
  type SyncEventRecurrence,
} from "@core/types/sync/event.contracts";
import { convertRfc5545ToIso } from "@core/util/date/date.util";
import {
  type EventScheduleRecord,
  type ExternalEventReference,
  type EventRecord as LegacyEventRecord,
} from "@backend/event/event.record";

/** Same role collapse as `google-calendar.adapter` ACCESS_ROLE_BY_GOOGLE. */
const ACCESS_ROLE_BY_LEGACY: Record<CalendarAccess, CalendarAccessRole> = {
  owner: "owner",
  writer: "editor",
  reader: "viewer",
  freeBusyReader: "busyOnly",
};

/** Same capability matrix as `google-calendar.adapter` CAPABILITIES_BY_ROLE. */
const CAPABILITIES_BY_ROLE: Record<CalendarAccessRole, CalendarCapabilities> = {
  owner: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  editor: {
    canReadEvents: true,
    canWriteEvents: true,
    canReadBusy: true,
    canInviteAttendees: true,
  },
  viewer: {
    canReadEvents: true,
    canWriteEvents: false,
    canReadBusy: true,
    canInviteAttendees: false,
  },
  busyOnly: {
    canReadEvents: false,
    canWriteEvents: false,
    canReadBusy: true,
    canInviteAttendees: false,
  },
};

export const MIGRATED_PROVIDER_VERSION: ProviderEventVersion =
  ProviderEventVersionSchema.parse("migrated-from-legacy");

const PLACEHOLDER_SERIES_ID = EventIdSchema.parse("000000000000000000000000");

export function mapAccessRole(access: CalendarAccess): CalendarAccessRole {
  return ACCESS_ROLE_BY_LEGACY[access] ?? "busyOnly";
}

export function capabilitiesForAccess(
  access: CalendarAccess,
): CalendarCapabilities {
  return CAPABILITIES_BY_ROLE[mapAccessRole(access)];
}

export function toSyncContent(
  content: LegacyEventRecord["content"],
): SyncEventContent {
  if (content.kind === "busy") {
    return {
      title: "",
      description: "",
      location: null,
      organizer: null,
      attendees: [],
      conference: null,
    };
  }
  return {
    title: content.title,
    description: content.description,
    location: null,
    organizer: null,
    attendees: [],
    conference: null,
  };
}

export function toSyncSchedule(schedule: EventScheduleRecord): EventSchedule {
  if (schedule.kind === "timed") {
    return {
      kind: "timed",
      start: DateTimeSchema.parse(schedule.start.toISOString()),
      end: DateTimeSchema.parse(schedule.end.toISOString()),
      timeZone: schedule.timeZone,
    };
  }
  return {
    kind: "allDay",
    start: schedule.start as DateOnly,
    end: schedule.end as DateOnly,
  };
}

function recurrenceIdFromGoogleInstanceId(
  externalReference: ExternalEventReference,
): DateTime | null {
  const { eventId, recurringEventId } = externalReference;
  if (!recurringEventId) return null;
  const prefix = `${recurringEventId}_`;
  if (!eventId.startsWith(prefix)) return null;
  const suffix = eventId.slice(prefix.length);
  const iso =
    convertRfc5545ToIso(suffix) ??
    (/^\d{8}$/.test(suffix)
      ? `${suffix.slice(0, 4)}-${suffix.slice(4, 6)}-${suffix.slice(6, 8)}T00:00:00.000Z`
      : null);
  if (!iso) return null;
  return DateTimeSchema.parse(iso);
}

/** Sync recurrenceId is the instance's original slot, not its current schedule. */
export function recurrenceIdFromOccurrence(
  schedule: EventScheduleRecord,
  externalReference: ExternalEventReference | null,
): DateTime {
  const fromProviderId =
    externalReference?.provider === "google"
      ? recurrenceIdFromGoogleInstanceId(externalReference)
      : null;
  if (fromProviderId) return fromProviderId;

  if (schedule.kind === "timed") {
    return DateTimeSchema.parse(schedule.start.toISOString());
  }
  return DateTimeSchema.parse(`${schedule.start}T00:00:00.000Z`);
}

export type SyncRecurrencePlan =
  | { ok: true; recurrence: SyncEventRecurrence; needsMaster: false }
  | {
      ok: true;
      recurrence: Extract<SyncEventRecurrence, { kind: "exception" }>;
      needsMaster: true;
      seriesProviderId: string;
      legacySeriesId: string;
    }
  | { ok: false; detail: string };

/**
 * Map a legacy Compass recurrence onto Sync. Occurrences become exceptions once
 * the Sync series master id is known; callers resolve `seriesId` after masters
 * are upserted.
 */
export function planSyncRecurrence(
  event: LegacyEventRecord,
): SyncRecurrencePlan {
  const recurrence = event.recurrence;
  if (recurrence.kind === "single") {
    return { ok: true, recurrence: { kind: "single" }, needsMaster: false };
  }
  if (recurrence.kind === "series") {
    return {
      ok: true,
      recurrence: { kind: "seriesMaster", rules: recurrence.rules },
      needsMaster: false,
    };
  }
  const seriesProviderId =
    event.externalReference?.recurringEventId?.trim() || null;
  if (!seriesProviderId) {
    return {
      ok: false,
      detail: "occurrence missing externalReference.recurringEventId",
    };
  }
  return {
    ok: true,
    recurrence: {
      kind: "exception",
      seriesId: PLACEHOLDER_SERIES_ID,
      recurrenceId: recurrenceIdFromOccurrence(
        event.schedule,
        event.externalReference,
      ),
      cancelled: false,
    },
    needsMaster: true,
    seriesProviderId,
    legacySeriesId: recurrence.seriesId.toHexString(),
  };
}

export function byHexId(a: { _id: ObjectId }, b: { _id: ObjectId }): number {
  return a._id.toHexString().localeCompare(b._id.toHexString());
}
