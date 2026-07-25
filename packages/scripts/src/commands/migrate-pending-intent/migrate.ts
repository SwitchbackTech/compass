import {
  buildBackfillCommandSubmit,
  buildUnlinkedEventRecord,
  byHexId,
  isWithinSyncHorizon,
  selectBackfillTarget,
  toEditableRecurrence,
  toSyncContent,
  toSyncRecurrence,
  toSyncSchedule,
} from "@scripts/commands/migrate-pending-intent/map";
import {
  type MigratePendingIntentReport,
  MigratePendingIntentReportSchema,
  type MigratePendingIntentSkip,
  type MigratePendingIntentUserResult,
} from "@scripts/commands/migrate-pending-intent/report.types";
import { type ObjectId } from "mongodb";
import { EventIdSchema } from "@core/types/domain-primitives";
import {
  type ConnectionId,
  type PrincipalId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { type Schema_User } from "@core/types/user.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { type EventRecord as LegacyEventRecord } from "@backend/event/event.record";
import { reprojectOccurrences } from "@sync/domain/reproject";
import { type CommandRepository } from "@sync/storage/repositories/command.repository";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";

export interface MigratePendingIntentSource {
  users: Array<{ _id: ObjectId } & Schema_User>;
  calendars: CalendarRecord[];
  events: LegacyEventRecord[];
}

export interface MigratePendingIntentDeps {
  connections: ProviderConnectionRepository;
  calendars: ProviderCalendarRepository;
  events: EventRepository;
  occurrences: EventOccurrenceRepository;
  commands: CommandRepository;
}

export interface MigratePendingIntentOptions {
  dryRun: boolean;
  now?: Date;
  userIds?: ReadonlySet<string>;
  /** Sync provider_calendars._id override (never email). */
  targetCalendarId?: string;
  /** Provider source calendar id override (e.g. "primary"). */
  targetGcalId?: string;
}

interface AggregateCounts {
  eventsCreated: number;
  eventsUpdated: number;
  eventsWouldCreate: number;
  eventsWouldUpdate: number;
  eventsSkipped: number;
  commandsCreated: number;
  commandsAlreadyPresent: number;
  commandsWouldCreate: number;
  commandsSkipped: number;
}

const emptyCounts = (): AggregateCounts => ({
  eventsCreated: 0,
  eventsUpdated: 0,
  eventsWouldCreate: 0,
  eventsWouldUpdate: 0,
  eventsSkipped: 0,
  commandsCreated: 0,
  commandsAlreadyPresent: 0,
  commandsWouldCreate: 0,
  commandsSkipped: 0,
});

/**
 * S49: preserve unlinked Compass events in Sync and submit resumable backfill
 * create commands for eligible events targeting an explicit Sync calendar.
 * Never mirrors already-linked events, never infers target by email, never
 * calls Google, never enqueues jobs.
 */
export async function migratePendingCompassIntent(
  deps: MigratePendingIntentDeps,
  source: MigratePendingIntentSource,
  options: MigratePendingIntentOptions,
): Promise<MigratePendingIntentReport> {
  const now = options.now ?? new Date();
  const nowFn = () => now;
  const skips: MigratePendingIntentSkip[] = [];
  const usersOut: MigratePendingIntentUserResult[] = [];
  const counts = emptyCounts();

  const users = [...source.users]
    .filter((user) =>
      options.userIds ? options.userIds.has(user._id.toHexString()) : true,
    )
    .sort(byHexId);

  const calendarsByUser = new Map<string, CalendarRecord[]>();
  for (const calendar of source.calendars) {
    const userId = calendar.userId.toHexString();
    const list = calendarsByUser.get(userId) ?? [];
    list.push(calendar);
    calendarsByUser.set(userId, list);
  }

  const eventsByCalendar = new Map<string, LegacyEventRecord[]>();
  for (const event of source.events) {
    const calendarId = event.calendarId.toHexString();
    const list = eventsByCalendar.get(calendarId) ?? [];
    list.push(event);
    eventsByCalendar.set(calendarId, list);
  }

  for (const user of users) {
    const userId = user._id.toHexString();
    const principal = toSyncPrincipal(userId);
    const tenantId = principal.tenantId as TenantId;
    const principalId = principal.principalId as PrincipalId;
    const userCounts = {
      eventsUpserted: 0,
      commandsSubmitted: 0,
      commandsAlreadyPresent: 0,
    };

    const userCalendars = calendarsByUser.get(userId) ?? [];
    const calendarById = new Map(
      userCalendars.map((c) => [c._id.toHexString(), c]),
    );

    const connections = await deps.connections.listByPrincipal(
      tenantId,
      principalId,
    );
    const liveGoogle = connections.find(
      (c) => c.provider === "google" && c.disconnectedAt == null,
    );

    const syncCalendars = await deps.calendars.listByPrincipal(
      tenantId,
      principalId,
      { activeOnly: false },
    );

    let targetCalendarId: string | null = null;
    let connectionId: ConnectionId | null = liveGoogle?._id ?? null;
    let targetOk = false;

    if (liveGoogle) {
      const selected = selectBackfillTarget(syncCalendars, {
        targetCalendarId: options.targetCalendarId,
        targetGcalId: options.targetGcalId,
      });
      if (selected.ok) {
        targetOk = true;
        targetCalendarId = selected.calendar._id;
        connectionId = selected.calendar.connectionId;
      } else if (options.targetCalendarId && selected.reason === "not_owned") {
        skips.push({
          category: "target_not_owned",
          id: options.targetCalendarId,
          detail: "target calendar is not owned by this principal",
        });
      } else if (selected.reason === "read_only") {
        skips.push({
          category: "read_only_target",
          id: options.targetCalendarId ?? options.targetGcalId ?? "default",
          detail: "selected target calendar is not writable",
        });
      }
    }

    const pendingEvents: LegacyEventRecord[] = [];
    for (const calendar of userCalendars) {
      for (const event of eventsByCalendar.get(calendar._id.toHexString()) ??
        []) {
        if (event.externalReference != null) {
          counts.eventsSkipped += 1;
          skips.push({
            category: "already_provider_linked",
            id: event._id.toHexString(),
            detail: "legacy event already has an external reference",
          });
          continue;
        }
        pendingEvents.push(event);
      }
    }
    pendingEvents.sort(byHexId);

    if (pendingEvents.length === 0 && !liveGoogle) {
      usersOut.push({
        userId,
        tenantId,
        principalId,
        connectionId: null,
        targetCalendarId: null,
        action: "skipped",
        skipCategory: "no_google_identity",
        detail: "no unlinked events and no live Sync google connection",
        counts: userCounts,
      });
      continue;
    }

    for (const event of pendingEvents) {
      const calendar = calendarById.get(event.calendarId.toHexString());
      if (!calendar) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "orphan_event",
          id: event._id.toHexString(),
          detail: "event calendar is not owned by this user",
        });
        continue;
      }

      if (event.content.kind === "busy") {
        counts.eventsSkipped += 1;
        skips.push({
          category: "busy_not_eligible",
          id: event._id.toHexString(),
          detail: "busy events are not eligible for provider backfill",
        });
        continue;
      }

      const syncRecurrence = toSyncRecurrence(event.recurrence);
      if (!syncRecurrence) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "occurrence_not_backfillable",
          id: event._id.toHexString(),
          detail: "occurrence rows are not independently backfilled",
        });
        continue;
      }

      let content: ReturnType<typeof toSyncContent>;
      let schedule: ReturnType<typeof toSyncSchedule>;
      try {
        content = toSyncContent(event.content);
        schedule = toSyncSchedule(event.schedule);
      } catch (error) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "unmappable_event",
          id: event._id.toHexString(),
          detail:
            error instanceof Error
              ? error.message
              : "failed to map event content/schedule",
        });
        continue;
      }

      const eventId = EventIdSchema.parse(event._id.toHexString());
      const existing = await deps.events.findById(
        tenantId,
        principalId,
        eventId,
      );

      if (existing?.providerEventId != null) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "already_provider_linked",
          id: event._id.toHexString(),
          detail: "Sync event already has provider identity",
        });
        continue;
      }

      if (options.dryRun) {
        if (existing) counts.eventsWouldUpdate += 1;
        else counts.eventsWouldCreate += 1;
        userCounts.eventsUpserted += 1;
      } else {
        const record = buildUnlinkedEventRecord({
          event,
          tenantId,
          principalId,
          content,
          schedule,
          recurrence: syncRecurrence,
          now,
          existing,
        });
        await deps.events.put(record);
        await reprojectOccurrences(deps.occurrences, record, nowFn);
        if (existing) counts.eventsUpdated += 1;
        else counts.eventsCreated += 1;
        userCounts.eventsUpserted += 1;
      }

      const editable = toEditableRecurrence(syncRecurrence);
      if (!editable) {
        counts.commandsSkipped += 1;
        continue;
      }

      if (!isWithinSyncHorizon(schedule, now)) {
        counts.commandsSkipped += 1;
        skips.push({
          category: "outside_sync_horizon",
          id: event._id.toHexString(),
          detail: "event preserved unlinked; outside sync horizon for backfill",
        });
        continue;
      }

      if (!liveGoogle) {
        counts.commandsSkipped += 1;
        skips.push({
          category: "missing_connection",
          id: event._id.toHexString(),
          detail: "no live Sync google connection for backfill command",
        });
        continue;
      }

      if (!targetOk || !targetCalendarId) {
        counts.commandsSkipped += 1;
        skips.push({
          category: "missing_selected_target",
          id: event._id.toHexString(),
          detail:
            "event preserved unlinked; no writable Sync calendar selected for backfill",
        });
        continue;
      }

      if (options.dryRun) {
        counts.commandsWouldCreate += 1;
        userCounts.commandsSubmitted += 1;
        continue;
      }

      const { inserted } = await deps.commands.submit(
        buildBackfillCommandSubmit({
          tenantId,
          principalId,
          eventId,
          targetCalendarId: targetCalendarId as never,
          content,
          schedule,
          editableRecurrence: editable,
        }),
      );
      if (inserted) {
        counts.commandsCreated += 1;
        userCounts.commandsSubmitted += 1;
      } else {
        counts.commandsAlreadyPresent += 1;
        userCounts.commandsAlreadyPresent += 1;
      }
    }

    usersOut.push({
      userId,
      tenantId,
      principalId,
      connectionId,
      targetCalendarId,
      action: options.dryRun ? "would_migrate" : "migrated",
      skipCategory: null,
      detail: options.dryRun
        ? "would preserve unlinked events and submit backfill commands"
        : "preserved unlinked events and submitted backfill commands",
      counts: userCounts,
    });
  }

  return MigratePendingIntentReportSchema.parse({
    generatedAt: now.toISOString(),
    dryRun: options.dryRun,
    counts: {
      usersScanned: users.length,
      usersMigrated: usersOut.filter((u) => u.action === "migrated").length,
      usersWouldMigrate: usersOut.filter((u) => u.action === "would_migrate")
        .length,
      usersSkipped: usersOut.filter((u) => u.action === "skipped").length,
      ...counts,
    },
    users: usersOut,
    skips: skips.sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.id.localeCompare(b.id),
    ),
  });
}
