import {
  byHexId,
  capabilitiesForAccess,
  MIGRATED_PROVIDER_VERSION,
  mapAccessRole,
  planSyncRecurrence,
  toSyncContent,
  toSyncSchedule,
} from "@scripts/commands/migrate-provider-state/map";
import {
  type MigrateProviderStateReport,
  MigrateProviderStateReportSchema,
  type MigrateProviderStateSample,
  type MigrateProviderStateSkip,
  type MigrateProviderStateUserResult,
} from "@scripts/commands/migrate-provider-state/report.types";
import { type ObjectId } from "mongodb";
import { type DateTime, type EventId } from "@core/types/domain-primitives";
import {
  type ConnectionId,
  type PrincipalId,
  type ProviderCalendarSourceId,
  type TenantId,
} from "@core/types/sync/identity.contracts";
import { Resource_Sync, type Schema_Sync } from "@core/types/sync.types";
import { type Schema_User } from "@core/types/user.types";
import { type Schema_Watch } from "@core/types/watch.types";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { type EventRecord as LegacyEventRecord } from "@backend/event/event.record";
import { reprojectOccurrences } from "@sync/domain/reproject";
import { type EventRecord as SyncEventRecord } from "@sync/storage/contracts/event.contracts";
import { type ProviderCalendarRecord } from "@sync/storage/contracts/provider-calendar.contracts";
import { type EventRepository } from "@sync/storage/repositories/event.repository";
import { type EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { type ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { type ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { type SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export interface MigrateProviderStateSource {
  users: Array<{ _id: ObjectId } & Schema_User>;
  calendars: CalendarRecord[];
  events: LegacyEventRecord[];
  syncDocs: Array<Partial<Schema_Sync> & { _id?: ObjectId; user: string }>;
  watches: Schema_Watch[];
}

export interface MigrateProviderStateDeps {
  connections: ProviderConnectionRepository;
  calendars: ProviderCalendarRepository;
  events: EventRepository;
  occurrences: EventOccurrenceRepository;
  resources: SyncResourceRepository;
}

export interface MigrateProviderStateOptions {
  dryRun: boolean;
  now?: Date;
  /** When set, only these Compass user ids are considered. */
  userIds?: ReadonlySet<string>;
}

interface AggregateCounts {
  calendarsCreated: number;
  calendarsUpdated: number;
  calendarsWouldCreate: number;
  calendarsWouldUpdate: number;
  calendarsSkipped: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsWouldCreate: number;
  eventsWouldUpdate: number;
  eventsSkipped: number;
  syncResourcesCreated: number;
  syncResourcesUpdated: number;
  syncResourcesWouldCreate: number;
  syncResourcesWouldUpdate: number;
  syncResourcesSkipped: number;
  watchesSkippedRewatch: number;
  unlinkedDeferred: number;
}

const emptyCounts = (): AggregateCounts => ({
  calendarsCreated: 0,
  calendarsUpdated: 0,
  calendarsWouldCreate: 0,
  calendarsWouldUpdate: 0,
  calendarsSkipped: 0,
  eventsCreated: 0,
  eventsUpdated: 0,
  eventsWouldCreate: 0,
  eventsWouldUpdate: 0,
  eventsSkipped: 0,
  syncResourcesCreated: 0,
  syncResourcesUpdated: 0,
  syncResourcesWouldCreate: 0,
  syncResourcesWouldUpdate: 0,
  syncResourcesSkipped: 0,
  watchesSkippedRewatch: 0,
  unlinkedDeferred: 0,
});

/**
 * Idempotently migrate legacy Google calendars, linked events, sync cursors,
 * and watch associations into Sync (S48). Never deletes source rows, never
 * calls Google, never enqueues jobs, never treats cache absence as deletion.
 * Unlinked events are deferred to S49. Legacy watches are skipped so Sync can
 * open fresh subscriptions (`subscription_requires_rewatch`).
 */
export async function migrateProviderSyncState(
  deps: MigrateProviderStateDeps,
  source: MigrateProviderStateSource,
  options: MigrateProviderStateOptions,
): Promise<MigrateProviderStateReport> {
  const now = options.now ?? new Date();
  const nowFn = () => now;
  const skips: MigrateProviderStateSkip[] = [];
  const usersOut: MigrateProviderStateUserResult[] = [];
  const samples: MigrateProviderStateSample[] = [];
  const counts = emptyCounts();

  const users = [...source.users]
    .filter((user) =>
      options.userIds ? options.userIds.has(user._id.toHexString()) : true,
    )
    .sort(byHexId);

  const calendarsByUser = groupCalendars(source.calendars);
  const eventsByCalendar = groupEvents(source.events);
  const syncByUser = groupSyncDocs(source.syncDocs);
  const watchesByUser = groupWatches(source.watches);

  for (const user of users) {
    const userId = user._id.toHexString();
    const principal = toSyncPrincipal(userId);
    const tenantId = principal.tenantId as TenantId;
    const principalId = principal.principalId as PrincipalId;

    const userCounts = {
      calendarsUpserted: 0,
      eventsUpserted: 0,
      syncResourcesUpserted: 0,
      unlinkedDeferred: 0,
      watchesSkippedRewatch: 0,
    };

    if (!user.google?.googleId?.trim()) {
      skips.push({
        category: "no_google_identity",
        id: userId,
        detail: "user has no google identity",
      });
      usersOut.push({
        userId,
        tenantId,
        principalId,
        connectionId: null,
        action: "skipped",
        skipCategory: "no_google_identity",
        detail: "user has no google identity",
        counts: userCounts,
      });
      continue;
    }

    const providerAccountId = user.google.googleId.trim();
    const connection = (
      await deps.connections.listByPrincipal(tenantId, principalId)
    ).find(
      (row) =>
        row.provider === "google" &&
        row.account.providerAccountId === providerAccountId,
    );

    if (!connection) {
      skips.push({
        category: "missing_connection",
        id: userId,
        detail: "run migrate-connections (S47) before migrate-provider-state",
      });
      usersOut.push({
        userId,
        tenantId,
        principalId,
        connectionId: null,
        action: "skipped",
        skipCategory: "missing_connection",
        detail: "no Sync google connection for this principal",
        counts: userCounts,
      });
      continue;
    }

    if (connection.disconnectedAt != null) {
      skips.push({
        category: "disconnected_in_sync",
        id: userId,
        detail: "Sync connection is disconnected; not migrating provider state",
      });
      usersOut.push({
        userId,
        tenantId,
        principalId,
        connectionId: connection._id,
        action: "skipped",
        skipCategory: "disconnected_in_sync",
        detail: "Sync connection is disconnected",
        counts: userCounts,
      });
      continue;
    }

    const connectionId = connection._id as ConnectionId;
    const existingCalendars = await deps.calendars.listByConnection(
      tenantId,
      principalId,
      connectionId,
    );
    const existingByProviderId = new Map(
      existingCalendars.map((row) => [row.providerCalendarId, row]),
    );

    const googleCalendars = selectGoogleCalendars(
      calendarsByUser.get(userId) ?? [],
      skips,
      counts,
    );

    const syncCalendarByGcalId = new Map<string, ProviderCalendarRecord>();

    for (const calendar of googleCalendars) {
      const providerCalendarId = calendar.source.calendarId;
      const existed = existingByProviderId.has(
        providerCalendarId as ProviderCalendarSourceId,
      );
      const fields = {
        tenantId,
        principalId,
        connectionId,
        providerCalendarId: providerCalendarId as ProviderCalendarSourceId,
        displayName: calendar.name.trim() || providerCalendarId,
        color: calendar.backgroundColor,
        active: calendar.isActive,
        primary: calendar.isPrimary,
        accessRole: mapAccessRole(calendar.access),
        capabilities: capabilitiesForAccess(calendar.access),
      };

      if (options.dryRun) {
        if (existed) counts.calendarsWouldUpdate += 1;
        else counts.calendarsWouldCreate += 1;
        userCounts.calendarsUpserted += 1;
        const stub =
          existingByProviderId.get(
            providerCalendarId as ProviderCalendarSourceId,
          ) ??
          ({
            _id: calendar._id.toHexString(),
            ...fields,
            createdAt: now,
            updatedAt: now,
          } as ProviderCalendarRecord);
        syncCalendarByGcalId.set(providerCalendarId, stub);
        continue;
      }

      const record = await deps.calendars.upsertByProviderCalendar(fields);
      syncCalendarByGcalId.set(providerCalendarId, record);
      if (existed) counts.calendarsUpdated += 1;
      else counts.calendarsCreated += 1;
      userCounts.calendarsUpserted += 1;
    }

    // Dry-run without prior Sync calendars: resources/events still report
    // would_* using provider calendar ids, but cannot bind Sync calendar ids.
    const existingResources = await deps.resources.listByConnection(
      tenantId,
      principalId,
      connectionId,
    );

    const syncDoc = syncByUser.get(userId);
    const userWatches = watchesByUser.get(userId) ?? [];

    await migrateCalendarListResource({
      deps,
      tenantId,
      principalId,
      connectionId,
      dryRun: options.dryRun,
      existingResources,
      syncDoc,
      now,
      counts,
      userCounts,
    });

    const eventCursorIds = new Set<string>();
    for (const row of syncDoc?.google?.events ?? []) {
      if (row.gCalendarId) eventCursorIds.add(row.gCalendarId);
    }
    for (const watch of userWatches) {
      if (watch.gCalendarId !== Resource_Sync.CALENDAR) {
        eventCursorIds.add(watch.gCalendarId);
      }
    }
    for (const gCalendarId of syncCalendarByGcalId.keys()) {
      eventCursorIds.add(gCalendarId);
    }

    for (const gCalendarId of [...eventCursorIds].sort()) {
      const syncCalendar = syncCalendarByGcalId.get(gCalendarId);
      if (!syncCalendar) {
        if (
          !options.dryRun ||
          !googleCalendars.some(
            (c) =>
              c.source.provider === "google" &&
              c.source.calendarId === gCalendarId,
          )
        ) {
          counts.syncResourcesSkipped += 1;
          skips.push({
            category: "orphan_cursor",
            id: `${userId}:${gCalendarId}`,
            detail: `events cursor/watch for gCalendarId=${gCalendarId} has no migrated provider calendar`,
          });
          continue;
        }
      }

      const calendarId = syncCalendar?._id ?? null;
      const cursor =
        syncDoc?.google?.events?.find((r) => r.gCalendarId === gCalendarId)
          ?.nextSyncToken ?? null;

      if (options.dryRun && !calendarId) {
        if (cursor) {
          counts.syncResourcesWouldCreate += 1;
          userCounts.syncResourcesUpserted += 1;
        }
        continue;
      }

      if (!calendarId) continue;

      await migrateEventsResource({
        deps,
        tenantId,
        principalId,
        connectionId,
        calendarId,
        gCalendarId,
        cursor,
        dryRun: options.dryRun,
        existingResources,
        now,
        counts,
        userCounts,
      });
    }

    for (const watch of userWatches) {
      counts.watchesSkippedRewatch += 1;
      userCounts.watchesSkippedRewatch += 1;
      skips.push({
        category: "subscription_requires_rewatch",
        id: String(watch._id),
        detail: `legacy watch for gCalendarId=${watch.gCalendarId}; Sync will open a fresh subscription`,
      });
    }

    const keptByGcalId = new Map(
      googleCalendars.map((calendar) => [calendar.source.calendarId, calendar]),
    );
    const legacyGoogleCalendarById = new Map<string, GoogleCalendarRecord>();
    for (const calendar of calendarsByUser.get(userId) ?? []) {
      if (calendar.source.provider !== "google") continue;
      const kept = keptByGcalId.get(calendar.source.calendarId);
      if (!kept) continue;
      legacyGoogleCalendarById.set(
        calendar._id.toHexString(),
        calendar as GoogleCalendarRecord,
      );
    }

    const userEvents: LegacyEventRecord[] = [];
    for (const calendarId of legacyGoogleCalendarById.keys()) {
      const list = eventsByCalendar.get(calendarId) ?? [];
      userEvents.push(...list);
    }
    userEvents.sort(byHexId);

    const linked: LegacyEventRecord[] = [];
    for (const event of userEvents) {
      if (event.externalReference == null) {
        counts.unlinkedDeferred += 1;
        userCounts.unlinkedDeferred += 1;
        skips.push({
          category: "unlinked_deferred",
          id: event._id.toHexString(),
          detail: "unlinked Compass event deferred to S49",
        });
        continue;
      }
      if (event.externalReference.provider !== "google") {
        counts.eventsSkipped += 1;
        skips.push({
          category: "unmappable_event",
          id: event._id.toHexString(),
          detail: `unsupported external provider=${event.externalReference.provider}`,
        });
        continue;
      }
      if (!event.externalReference.eventId.trim()) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "missing_provider_event_id",
          id: event._id.toHexString(),
          detail: "linked event has empty provider event id",
        });
        continue;
      }
      linked.push(event);
    }

    const mastersAndSingles = linked.filter(
      (event) => event.recurrence.kind !== "occurrence",
    );
    const exceptions = linked.filter(
      (event) => event.recurrence.kind === "occurrence",
    );

    const syncMasterByProviderId = new Map<string, SyncEventRecord>();
    const upsertedSyncEvents: SyncEventRecord[] = [];

    for (const event of [...mastersAndSingles, ...exceptions]) {
      const calendar = legacyGoogleCalendarById.get(
        event.calendarId.toHexString(),
      );
      if (!calendar) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "orphan_event",
          id: event._id.toHexString(),
          detail: "event calendar is not a migrated google calendar",
        });
        continue;
      }

      const syncCalendar = syncCalendarByGcalId.get(calendar.source.calendarId);
      if (!syncCalendar) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "orphan_event",
          id: event._id.toHexString(),
          detail: "no Sync provider calendar for event",
        });
        continue;
      }

      const plan = planSyncRecurrence(event);
      if (!plan.ok) {
        counts.eventsSkipped += 1;
        skips.push({
          category: "unmappable_event",
          id: event._id.toHexString(),
          detail: plan.detail,
        });
        continue;
      }

      let recurrence = plan.recurrence;
      if (plan.needsMaster) {
        const master =
          syncMasterByProviderId.get(plan.seriesProviderId) ??
          (await deps.events.findByProviderIdentity(tenantId, principalId, {
            connectionId,
            calendarId: syncCalendar._id,
            providerEventId: plan.seriesProviderId as never,
          }));
        if (!master || master.recurrence.kind !== "seriesMaster") {
          counts.eventsSkipped += 1;
          skips.push({
            category: "missing_series_master",
            id: event._id.toHexString(),
            detail: `no Sync series master for providerEventId=${plan.seriesProviderId} (legacy seriesId=${plan.legacySeriesId})`,
          });
          continue;
        }
        syncMasterByProviderId.set(plan.seriesProviderId, master);
        recurrence = {
          kind: "exception",
          seriesId: master._id as EventId,
          recurrenceId: plan.recurrence.recurrenceId,
          cancelled: false,
        };
      }

      const providerEventId = event.externalReference!.eventId.trim();
      const existing = await deps.events.findByProviderIdentity(
        tenantId,
        principalId,
        {
          connectionId,
          calendarId: syncCalendar._id,
          providerEventId: providerEventId as never,
        },
      );

      if (options.dryRun) {
        if (existing) counts.eventsWouldUpdate += 1;
        else counts.eventsWouldCreate += 1;
        userCounts.eventsUpserted += 1;
        maybeSample(samples, event);
        if (recurrence.kind === "seriesMaster") {
          syncMasterByProviderId.set(
            providerEventId,
            existing?.recurrence.kind === "seriesMaster"
              ? existing
              : ({
                  _id: (existing?._id ??
                    event._id.toHexString()) as SyncEventRecord["_id"],
                  recurrence,
                  providerEventId,
                } as SyncEventRecord),
          );
        }
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

      const eventsResource = existingResources.find(
        (row) =>
          row.resourceKind === "events" && row.calendarId === syncCalendar._id,
      );
      const generation =
        existing?.generation ?? eventsResource?.activeGeneration ?? 0;

      const record = await deps.events.upsertByProviderIdentity({
        tenantId,
        principalId,
        origin: "provider",
        calendarId: syncCalendar._id,
        clientEventId: null,
        connectionId,
        providerEventId: providerEventId as never,
        providerVersion: MIGRATED_PROVIDER_VERSION,
        providerUpdatedAt: event.updatedAt,
        deliveryState: null,
        providerMetadata: null,
        content,
        schedule,
        recurrence,
        lifecycleState: "active",
        generation,
        confirmedAt: now,
      });

      if (existing) counts.eventsUpdated += 1;
      else counts.eventsCreated += 1;
      userCounts.eventsUpserted += 1;
      upsertedSyncEvents.push(record);
      maybeSample(samples, event);

      if (record.recurrence.kind === "seriesMaster" && record.providerEventId) {
        syncMasterByProviderId.set(record.providerEventId, record);
      }
    }

    if (!options.dryRun) {
      await reprojectMigratedEvents(
        deps.occurrences,
        upsertedSyncEvents,
        nowFn,
      );
    }

    usersOut.push({
      userId,
      tenantId,
      principalId,
      connectionId,
      action: options.dryRun ? "would_migrate" : "migrated",
      skipCategory: null,
      detail: options.dryRun
        ? "would upsert calendars, linked events, and sync resources"
        : "upserted calendars, linked events, and sync resources",
      counts: userCounts,
    });
  }

  return MigrateProviderStateReportSchema.parse({
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
    samples,
  });
}

function maybeSample(
  samples: MigrateProviderStateSample[],
  event: LegacyEventRecord,
): void {
  if (samples.length >= 5) return;
  if (event.externalReference?.provider !== "google") return;
  samples.push({
    sourceEventId: event._id.toHexString(),
    providerEventId: event.externalReference.eventId,
    title: event.content.kind === "details" ? event.content.title : "",
    recurrenceKind: event.recurrence.kind,
    scheduleKind: event.schedule.kind,
  });
}

async function reprojectMigratedEvents(
  occurrences: EventOccurrenceRepository,
  events: readonly SyncEventRecord[],
  now: () => Date,
): Promise<void> {
  const masters = events.filter((e) => e.recurrence.kind === "seriesMaster");
  const exceptions = events.filter((e) => e.recurrence.kind === "exception");
  const singles = events.filter((e) => e.recurrence.kind === "single");

  for (const master of masters) {
    const seriesExceptions = exceptions.filter(
      (row) =>
        row.recurrence.kind === "exception" &&
        row.recurrence.seriesId === master._id,
    );
    const instants = seriesExceptions.map((row) => {
      if (row.recurrence.kind !== "exception") {
        throw new Error("expected exception");
      }
      return row.recurrence.recurrenceId as DateTime;
    });
    await reprojectOccurrences(occurrences, master, now, instants);
  }

  for (const exception of exceptions) {
    await reprojectOccurrences(occurrences, exception, now);
  }
  for (const single of singles) {
    await reprojectOccurrences(occurrences, single, now);
  }
}

async function migrateCalendarListResource(args: {
  deps: MigrateProviderStateDeps;
  tenantId: TenantId;
  principalId: PrincipalId;
  connectionId: ConnectionId;
  dryRun: boolean;
  existingResources: Awaited<
    ReturnType<SyncResourceRepository["listByConnection"]>
  >;
  syncDoc: (Partial<Schema_Sync> & { user: string }) | undefined;
  now: Date;
  counts: AggregateCounts;
  userCounts: MigrateProviderStateUserResult["counts"];
}): Promise<void> {
  const cursor =
    args.syncDoc?.google?.calendarlist?.find((r) => Boolean(r.nextSyncToken))
      ?.nextSyncToken ?? null;
  const existing = args.existingResources.find(
    (row) => row.resourceKind === "calendarList" && row.calendarId === null,
  );

  if (!cursor && !existing) {
    // Still ensure a calendarList resource on apply so discovery has a home.
    if (args.dryRun) {
      args.counts.syncResourcesWouldCreate += 1;
      args.userCounts.syncResourcesUpserted += 1;
      return;
    }
    await args.deps.resources.ensure({
      tenantId: args.tenantId,
      principalId: args.principalId,
      connectionId: args.connectionId,
      resourceKind: "calendarList",
      calendarId: null,
    });
    args.counts.syncResourcesCreated += 1;
    args.userCounts.syncResourcesUpserted += 1;
    return;
  }

  if (args.dryRun) {
    if (existing) args.counts.syncResourcesWouldUpdate += 1;
    else args.counts.syncResourcesWouldCreate += 1;
    args.userCounts.syncResourcesUpserted += 1;
    return;
  }

  const resource = await args.deps.resources.ensure({
    tenantId: args.tenantId,
    principalId: args.principalId,
    connectionId: args.connectionId,
    resourceKind: "calendarList",
    calendarId: null,
  });
  if (cursor) {
    await args.deps.resources.advanceCursor(
      args.tenantId,
      args.principalId,
      resource._id,
      cursor,
      args.now,
    );
  }
  if (existing) args.counts.syncResourcesUpdated += 1;
  else args.counts.syncResourcesCreated += 1;
  args.userCounts.syncResourcesUpserted += 1;
}

async function migrateEventsResource(args: {
  deps: MigrateProviderStateDeps;
  tenantId: TenantId;
  principalId: PrincipalId;
  connectionId: ConnectionId;
  calendarId: ProviderCalendarRecord["_id"];
  gCalendarId: string;
  cursor: string | null;
  dryRun: boolean;
  existingResources: Awaited<
    ReturnType<SyncResourceRepository["listByConnection"]>
  >;
  now: Date;
  counts: AggregateCounts;
  userCounts: MigrateProviderStateUserResult["counts"];
}): Promise<void> {
  const existing = args.existingResources.find(
    (row) =>
      row.resourceKind === "events" && row.calendarId === args.calendarId,
  );

  if (args.dryRun) {
    if (existing) args.counts.syncResourcesWouldUpdate += 1;
    else args.counts.syncResourcesWouldCreate += 1;
    args.userCounts.syncResourcesUpserted += 1;
    return;
  }

  const resource = await args.deps.resources.ensure({
    tenantId: args.tenantId,
    principalId: args.principalId,
    connectionId: args.connectionId,
    resourceKind: "events",
    calendarId: args.calendarId,
  });
  if (args.cursor) {
    await args.deps.resources.advanceCursor(
      args.tenantId,
      args.principalId,
      resource._id,
      args.cursor,
      args.now,
    );
  }
  if (existing) args.counts.syncResourcesUpdated += 1;
  else args.counts.syncResourcesCreated += 1;
  args.userCounts.syncResourcesUpserted += 1;
}

type GoogleCalendarRecord = CalendarRecord & {
  source: Extract<CalendarRecord["source"], { provider: "google" }>;
};

function selectGoogleCalendars(
  calendars: CalendarRecord[],
  skips: MigrateProviderStateSkip[],
  counts: AggregateCounts,
): GoogleCalendarRecord[] {
  const selected: GoogleCalendarRecord[] = [];
  const seen = new Map<string, GoogleCalendarRecord>();

  for (const calendar of [...calendars].sort(byHexId)) {
    if (calendar.source.provider !== "google") {
      counts.calendarsSkipped += 1;
      skips.push({
        category: "local_calendar",
        id: calendar._id.toHexString(),
        detail: "local calendars are not provider sync state",
      });
      continue;
    }
    const googleCalendar = calendar as GoogleCalendarRecord;
    const key = googleCalendar.source.calendarId;
    const prior = seen.get(key);
    if (prior) {
      counts.calendarsSkipped += 1;
      skips.push({
        category: "duplicate_google_calendar",
        id: calendar._id.toHexString(),
        detail: `duplicate (userId, source.calendarId); keeping ${prior._id.toHexString()}`,
      });
      continue;
    }
    seen.set(key, googleCalendar);
    selected.push(googleCalendar);
  }
  return selected;
}

function groupCalendars(
  calendars: CalendarRecord[],
): Map<string, CalendarRecord[]> {
  const map = new Map<string, CalendarRecord[]>();
  for (const calendar of calendars) {
    const userId = calendar.userId.toHexString();
    const list = map.get(userId) ?? [];
    list.push(calendar);
    map.set(userId, list);
  }
  return map;
}

function groupEvents(
  events: LegacyEventRecord[],
): Map<string, LegacyEventRecord[]> {
  const map = new Map<string, LegacyEventRecord[]>();
  for (const event of events) {
    const calendarId = event.calendarId.toHexString();
    const list = map.get(calendarId) ?? [];
    list.push(event);
    map.set(calendarId, list);
  }
  return map;
}

function groupSyncDocs(
  syncDocs: MigrateProviderStateSource["syncDocs"],
): Map<string, MigrateProviderStateSource["syncDocs"][number]> {
  const map = new Map<string, MigrateProviderStateSource["syncDocs"][number]>();
  for (const doc of [...syncDocs].sort((a, b) =>
    a.user.localeCompare(b.user),
  )) {
    if (!map.has(doc.user)) map.set(doc.user, doc);
  }
  return map;
}

function groupWatches(watches: Schema_Watch[]): Map<string, Schema_Watch[]> {
  const map = new Map<string, Schema_Watch[]>();
  for (const watch of watches) {
    const list = map.get(watch.user) ?? [];
    list.push(watch);
    map.set(watch.user, list);
  }
  return map;
}
