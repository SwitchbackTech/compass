import {
  type InventoryCollections,
  inventoryLegacySyncData,
} from "@scripts/commands/inventory-legacy-sync/inventory";
import { migrateProviderConnections } from "@scripts/commands/migrate-connections/migrate";
import { migratePendingCompassIntent } from "@scripts/commands/migrate-pending-intent/migrate";
import { migrateProviderSyncState } from "@scripts/commands/migrate-provider-state/migrate";
import {
  buildExecutionRecord,
  type PhaseExecutionSummary,
  writePreseedArtifacts,
} from "@scripts/commands/preseed-sync/execution-record";
import {
  evaluatePreseedParity,
  type PreseedPhaseReports,
} from "@scripts/commands/preseed-sync/parity";
import {
  type PreseedMode,
  type PreseedParityReport,
  PreseedParityReportSchema,
  type PreseedPhase,
} from "@scripts/commands/preseed-sync/report.types";
import { type Db, type MongoClient } from "mongodb";
import { CommandRepository } from "@sync/storage/repositories/command.repository";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { EventRepository } from "@sync/storage/repositories/event.repository";
import { EventOccurrenceRepository } from "@sync/storage/repositories/event-occurrence.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export type PreseedOptions = {
  dryRun: boolean;
  mode: PreseedMode;
  phase: PreseedPhase;
  userIds?: Set<string>;
  targetCalendarId?: string;
  targetGcalId?: string;
  now?: Date;
  outDir?: string | null;
  argv?: string[];
  gitSha?: string | null;
  compassApiMongoDbName?: string | null;
  syncMongoDbName?: string | null;
};

export type PreseedResult = {
  exitCode: 0 | 1;
  report: PreseedParityReport;
};

const PHASE_ORDER = ["inventory", "connections", "state", "pending"] as const;

function phasesToRun(phase: PreseedPhase): Array<(typeof PHASE_ORDER)[number]> {
  if (phase === "all") return [...PHASE_ORDER];
  return [phase];
}

function filterCollections(
  collections: InventoryCollections,
  userIds: Set<string> | undefined,
): InventoryCollections {
  if (!userIds || userIds.size === 0) return collections;
  const users = collections.users.filter((u) =>
    userIds.has(u._id.toHexString()),
  );
  const userIdSet = new Set(users.map((u) => u._id.toHexString()));
  const calendars = collections.calendars.filter((c) =>
    userIdSet.has(c.userId.toHexString()),
  );
  const calendarIds = new Set(calendars.map((c) => c._id.toHexString()));
  return {
    users,
    calendars,
    events: collections.events.filter((e) =>
      calendarIds.has(e.calendarId.toHexString()),
    ),
    syncDocs: collections.syncDocs.filter((s) => userIdSet.has(s.user)),
    watches: collections.watches.filter((w) => userIdSet.has(w.user)),
  };
}

/**
 * Compose S46–S49 into a resumable pre-seed with blocking parity (S51).
 * Never enables workers/callbacks, never deletes source records, never calls
 * Google. Returns an exitCode for the CLI to propagate.
 */
export async function runPreseedSyncComposition(
  deps: {
    loadCollections: () => Promise<InventoryCollections>;
    syncDb: Db;
    syncClient: MongoClient;
  },
  options: PreseedOptions,
): Promise<PreseedResult> {
  const startedAt = options.now ?? new Date();
  const dryRun = options.dryRun;
  const selected = phasesToRun(options.phase);
  const phases: PreseedPhaseReports = {};
  const phasesExecuted: PhaseExecutionSummary[] = [];
  const phaseArtifacts: Array<{ relativePath: string; json: unknown }> = [];

  const connections = new ProviderConnectionRepository(deps.syncDb);
  const credentials = new CredentialRepository(deps.syncDb);
  const calendars = new ProviderCalendarRepository(deps.syncDb);
  const events = new EventRepository(deps.syncDb);
  const occurrences = new EventOccurrenceRepository(
    deps.syncDb,
    deps.syncClient,
  );
  const resources = new SyncResourceRepository(deps.syncDb);
  const commands = new CommandRepository(deps.syncDb);

  let collections: InventoryCollections | null = null;
  const ensureCollections = async () => {
    if (!collections) {
      collections = filterCollections(
        await deps.loadCollections(),
        options.userIds,
      );
    }
    return collections;
  };

  for (const name of selected) {
    const phaseStarted = new Date();
    if (name === "inventory") {
      const source = await ensureCollections();
      const report = inventoryLegacySyncData(source, { now: startedAt });
      phases.inventory = report;
      phasesExecuted.push({
        name,
        startedAt: phaseStarted.toISOString(),
        finishedAt: new Date().toISOString(),
        dryRun: true,
        summaryCounts: {
          users: report.source.users.total,
          withGoogle: report.source.users.withGoogle,
          duplicates: report.duplicates.length,
          orphans: report.orphans.length,
        },
        artifactPath: "phases/inventory.json",
      });
      phaseArtifacts.push({
        relativePath: "phases/inventory.json",
        json: report,
      });
      const inventoryParity = evaluatePreseedParity(
        { inventory: report },
        { mode: options.mode, dryRun },
      );
      if (!dryRun && inventoryParity.blockers.length > 0) {
        break;
      }
      continue;
    }

    if (name === "connections") {
      const source = await ensureCollections();
      const report = await migrateProviderConnections(
        { connections, credentials },
        source.users,
        { dryRun, userIds: options.userIds, now: startedAt },
      );
      phases.connections = report;
      phasesExecuted.push({
        name,
        startedAt: phaseStarted.toISOString(),
        finishedAt: new Date().toISOString(),
        dryRun,
        summaryCounts: { ...report.counts },
        artifactPath: "phases/connections.json",
      });
      phaseArtifacts.push({
        relativePath: "phases/connections.json",
        json: report,
      });
      continue;
    }

    if (name === "state") {
      const source = await ensureCollections();
      const report = await migrateProviderSyncState(
        {
          connections,
          calendars,
          events,
          occurrences,
          resources,
        },
        source,
        { dryRun, userIds: options.userIds, now: startedAt },
      );
      phases.providerState = report;
      phasesExecuted.push({
        name,
        startedAt: phaseStarted.toISOString(),
        finishedAt: new Date().toISOString(),
        dryRun,
        summaryCounts: { ...report.counts },
        artifactPath: "phases/provider-state.json",
      });
      phaseArtifacts.push({
        relativePath: "phases/provider-state.json",
        json: report,
      });
      continue;
    }

    const source = await ensureCollections();
    const report = await migratePendingCompassIntent(
      {
        connections,
        calendars,
        events,
        occurrences,
        commands,
      },
      source,
      {
        dryRun,
        userIds: options.userIds,
        now: startedAt,
        targetCalendarId: options.targetCalendarId,
        targetGcalId: options.targetGcalId,
      },
    );
    phases.pendingIntent = report;
    phasesExecuted.push({
      name,
      startedAt: phaseStarted.toISOString(),
      finishedAt: new Date().toISOString(),
      dryRun,
      summaryCounts: { ...report.counts },
      artifactPath: "phases/pending-intent.json",
    });
    phaseArtifacts.push({
      relativePath: "phases/pending-intent.json",
      json: report,
    });
  }

  // Frozen apply: re-plan dry-run on the same source to detect residual creates.
  if (options.mode === "frozen" && !dryRun) {
    const source = await ensureCollections();
    if (selected.includes("connections") && phases.connections) {
      const residualConnections = await migrateProviderConnections(
        { connections, credentials },
        source.users,
        { dryRun: true, userIds: options.userIds, now: startedAt },
      );
      // Overlay would_* from the convergence pass onto the apply reports so
      // evaluatePreseedParity can see residual creates after apply.
      phases.connections = {
        ...phases.connections,
        counts: {
          ...phases.connections.counts,
          wouldCreate: residualConnections.counts.wouldCreate,
          wouldUpdate: residualConnections.counts.wouldUpdate,
        },
      };
    }
    if (selected.includes("state") && phases.providerState) {
      const residualState = await migrateProviderSyncState(
        { connections, calendars, events, occurrences, resources },
        source,
        { dryRun: true, userIds: options.userIds, now: startedAt },
      );
      phases.providerState = {
        ...phases.providerState,
        counts: {
          ...phases.providerState.counts,
          calendarsWouldCreate: residualState.counts.calendarsWouldCreate,
          eventsWouldCreate: residualState.counts.eventsWouldCreate,
          syncResourcesWouldCreate:
            residualState.counts.syncResourcesWouldCreate,
        },
      };
    }
    if (selected.includes("pending") && phases.pendingIntent) {
      const residualPending = await migratePendingCompassIntent(
        { connections, calendars, events, occurrences, commands },
        source,
        {
          dryRun: true,
          userIds: options.userIds,
          now: startedAt,
          targetCalendarId: options.targetCalendarId,
          targetGcalId: options.targetGcalId,
        },
      );
      phases.pendingIntent = {
        ...phases.pendingIntent,
        counts: {
          ...phases.pendingIntent.counts,
          eventsWouldCreate: residualPending.counts.eventsWouldCreate,
          commandsWouldCreate: residualPending.counts.commandsWouldCreate,
        },
      };
    }
  }

  const parity = evaluatePreseedParity(phases, {
    mode: options.mode,
    dryRun,
  });
  const finishedAt = new Date();
  const report = PreseedParityReportSchema.parse({
    generatedAt: finishedAt.toISOString(),
    dryRun,
    mode: options.mode,
    phase: options.phase,
    userIdFilter: options.userIds ? [...options.userIds].sort() : null,
    phases,
    parity,
  });

  const exitCode: 0 | 1 = parity.ok ? 0 : 1;
  const executionRecord = buildExecutionRecord({
    startedAt,
    finishedAt,
    argv: options.argv ?? [],
    dryRun,
    mode: options.mode,
    phase: options.phase,
    userIdFilter: report.userIdFilter,
    outDir: options.outDir ?? null,
    gitSha: options.gitSha ?? null,
    compassApiMongoDbName: options.compassApiMongoDbName ?? null,
    syncMongoDbName: options.syncMongoDbName ?? null,
    phasesExecuted,
    parityReport: report,
    exitCode,
  });

  if (options.outDir) {
    writePreseedArtifacts(
      options.outDir,
      report,
      executionRecord,
      phaseArtifacts,
    );
  }

  return { exitCode, report };
}
