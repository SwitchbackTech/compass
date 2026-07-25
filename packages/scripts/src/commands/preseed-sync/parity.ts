import { type LegacySyncInventoryReport } from "@scripts/commands/inventory-legacy-sync/report.types";
import { type MigrateConnectionsReport } from "@scripts/commands/migrate-connections/report.types";
import { type MigratePendingIntentReport } from "@scripts/commands/migrate-pending-intent/report.types";
import { type MigrateProviderStateReport } from "@scripts/commands/migrate-provider-state/report.types";
import {
  type PreseedFinding,
  type PreseedMode,
  type PreseedParity,
} from "@scripts/commands/preseed-sync/report.types";

const INVENTORY_BLOCKING_SKIPS = new Set([
  "missing_refresh_token",
  "orphan_calendar",
  "orphan_event",
  "orphan_sync",
  "orphan_watch",
  "orphan_cursor_calendar",
  "orphan_watch_calendar",
  "duplicate_google_calendar",
  "duplicate_sync_user",
  "duplicate_watch",
  "legacy_nested_watch",
]);

const INVENTORY_EXPLAINED_SKIPS = new Set(["no_google_identity"]);

const CONNECTION_BLOCKING = new Set([
  "missing_refresh_token",
  "empty_google_id",
  "disconnected_in_sync",
]);

const CONNECTION_EXPLAINED = new Set(["no_google_identity"]);

const STATE_BLOCKING = new Set([
  "missing_connection",
  "disconnected_in_sync",
  "orphan_calendar",
  "orphan_event",
  "orphan_cursor",
  "duplicate_google_calendar",
  "missing_provider_event_id",
  "missing_series_master",
  "unmappable_event",
]);

const STATE_EXPLAINED = new Set([
  "no_google_identity",
  "local_calendar",
  "unlinked_deferred",
  "subscription_requires_rewatch",
]);

const PENDING_BLOCKING = new Set([
  "missing_selected_target",
  "missing_connection",
  "orphan_event",
  "unmappable_event",
  "read_only_target",
  "target_not_owned",
]);

const PENDING_EXPLAINED = new Set([
  "already_provider_linked",
  "occurrence_not_backfillable",
  "busy_not_eligible",
  "outside_sync_horizon",
  "no_google_identity",
]);

export type PreseedPhaseReports = {
  inventory?: LegacySyncInventoryReport;
  connections?: MigrateConnectionsReport;
  providerState?: MigrateProviderStateReport;
  pendingIntent?: MigratePendingIntentReport;
};

/**
 * Derive blocking vs explained findings from S46–S49 reports (R-MIG-05).
 * `frozen` additionally fails when an apply still leaves residual creates.
 */
export function evaluatePreseedParity(
  phases: PreseedPhaseReports,
  options: { mode: PreseedMode; dryRun: boolean },
): PreseedParity {
  const blockers: PreseedFinding[] = [];
  const warnings: PreseedFinding[] = [];
  let unexplainedSkips = 0;

  const inventory = phases.inventory;
  if (inventory) {
    for (const dup of inventory.duplicates) {
      blockers.push({
        code: "inventory_duplicate",
        phase: "inventory",
        id: dup.key,
        detail: `${dup.kind} count=${dup.count}`,
      });
    }
    for (const orphan of inventory.orphans) {
      blockers.push({
        code: "inventory_orphan",
        phase: "inventory",
        id: orphan.id,
        detail: `${orphan.kind}: ${orphan.reason}`,
      });
    }
    for (const missing of inventory.missingAuthority) {
      if (missing.reason === "no_google") {
        warnings.push({
          code: "inventory_missing_authority",
          phase: "inventory",
          id: missing.userId,
          detail: missing.reason,
        });
        continue;
      }
      blockers.push({
        code: "inventory_missing_authority",
        phase: "inventory",
        id: missing.userId,
        detail: missing.reason,
      });
    }
    for (const skip of inventory.skips) {
      if (INVENTORY_EXPLAINED_SKIPS.has(skip.category)) {
        warnings.push({
          code: skip.category,
          phase: "inventory",
          id: skip.id,
          detail: skip.detail,
        });
      } else if (INVENTORY_BLOCKING_SKIPS.has(skip.category)) {
        blockers.push({
          code: "inventory_blocking_skip",
          phase: "inventory",
          id: skip.id,
          detail: `${skip.category}: ${skip.detail}`,
        });
      } else {
        unexplainedSkips += 1;
        blockers.push({
          code: "inventory_blocking_skip",
          phase: "inventory",
          id: skip.id,
          detail: `unexplained skip ${skip.category}: ${skip.detail}`,
        });
      }
    }
  }

  const connections = phases.connections;
  if (connections) {
    for (const result of connections.results) {
      if (result.action !== "skipped" || !result.skipCategory) {
        if (
          !options.dryRun &&
          (result.action === "created" || result.action === "updated") &&
          !result.credentialVerified
        ) {
          blockers.push({
            code: "connection_credential_unverified",
            phase: "connections",
            id: result.userId,
            detail: result.detail,
          });
        }
        continue;
      }
      if (CONNECTION_EXPLAINED.has(result.skipCategory)) {
        warnings.push({
          code: result.skipCategory,
          phase: "connections",
          id: result.userId,
          detail: result.detail,
        });
      } else if (CONNECTION_BLOCKING.has(result.skipCategory)) {
        blockers.push({
          code:
            result.skipCategory === "missing_refresh_token"
              ? "connection_missing_refresh_token"
              : result.skipCategory === "empty_google_id"
                ? "connection_empty_google_id"
                : "connection_disconnected_in_sync",
          phase: "connections",
          id: result.userId,
          detail: result.detail,
        });
      } else {
        unexplainedSkips += 1;
        blockers.push({
          code: result.skipCategory,
          phase: "connections",
          id: result.userId,
          detail: `unexplained skip: ${result.detail}`,
        });
      }
    }
  }

  const providerState = phases.providerState;
  if (providerState) {
    for (const skip of providerState.skips) {
      if (STATE_EXPLAINED.has(skip.category)) {
        warnings.push({
          code: skip.category,
          phase: "state",
          id: skip.id,
          detail: skip.detail,
        });
      } else if (STATE_BLOCKING.has(skip.category)) {
        blockers.push({
          code: "state_blocking_skip",
          phase: "state",
          id: skip.id,
          detail: `${skip.category}: ${skip.detail}`,
        });
      } else {
        unexplainedSkips += 1;
        blockers.push({
          code: "state_blocking_skip",
          phase: "state",
          id: skip.id,
          detail: `unexplained skip ${skip.category}: ${skip.detail}`,
        });
      }
    }
  }

  const pendingIntent = phases.pendingIntent;
  if (pendingIntent) {
    for (const skip of pendingIntent.skips) {
      if (PENDING_EXPLAINED.has(skip.category)) {
        warnings.push({
          code: skip.category,
          phase: "pending",
          id: skip.id,
          detail: skip.detail,
        });
      } else if (PENDING_BLOCKING.has(skip.category)) {
        blockers.push({
          code: "pending_blocking_skip",
          phase: "pending",
          id: skip.id,
          detail: `${skip.category}: ${skip.detail}`,
        });
      } else {
        unexplainedSkips += 1;
        blockers.push({
          code: "pending_blocking_skip",
          phase: "pending",
          id: skip.id,
          detail: `unexplained skip ${skip.category}: ${skip.detail}`,
        });
      }
    }
  }

  const deltaCreates =
    (connections?.counts.created ?? 0) +
    (connections?.counts.wouldCreate ?? 0) +
    (providerState?.counts.calendarsCreated ?? 0) +
    (providerState?.counts.calendarsWouldCreate ?? 0) +
    (providerState?.counts.eventsCreated ?? 0) +
    (providerState?.counts.eventsWouldCreate ?? 0) +
    (providerState?.counts.syncResourcesCreated ?? 0) +
    (providerState?.counts.syncResourcesWouldCreate ?? 0) +
    (pendingIntent?.counts.eventsCreated ?? 0) +
    (pendingIntent?.counts.eventsWouldCreate ?? 0) +
    (pendingIntent?.counts.commandsCreated ?? 0) +
    (pendingIntent?.counts.commandsWouldCreate ?? 0);

  const deltaUpdates =
    (connections?.counts.updated ?? 0) +
    (connections?.counts.wouldUpdate ?? 0) +
    (providerState?.counts.calendarsUpdated ?? 0) +
    (providerState?.counts.calendarsWouldUpdate ?? 0) +
    (providerState?.counts.eventsUpdated ?? 0) +
    (providerState?.counts.eventsWouldUpdate ?? 0) +
    (providerState?.counts.syncResourcesUpdated ?? 0) +
    (providerState?.counts.syncResourcesWouldUpdate ?? 0) +
    (pendingIntent?.counts.eventsUpdated ?? 0) +
    (pendingIntent?.counts.eventsWouldUpdate ?? 0);

  // Frozen cutover: after apply, residual would_create means the source still
  // has unmigrated rows (or the plan did not converge). Live allows creates.
  if (options.mode === "frozen" && !options.dryRun) {
    const residualWouldCreate =
      (connections?.counts.wouldCreate ?? 0) +
      (providerState?.counts.calendarsWouldCreate ?? 0) +
      (providerState?.counts.eventsWouldCreate ?? 0) +
      (providerState?.counts.syncResourcesWouldCreate ?? 0) +
      (pendingIntent?.counts.eventsWouldCreate ?? 0) +
      (pendingIntent?.counts.commandsWouldCreate ?? 0);
    if (residualWouldCreate > 0) {
      blockers.push({
        code: "frozen_residual_creates",
        phase: "aggregate",
        id: "frozen",
        detail: `frozen apply left wouldCreate=${residualWouldCreate}`,
      });
    }
  }

  return {
    ok: blockers.length === 0,
    blockers,
    warnings,
    counts: {
      unexplainedSkips,
      duplicateIdentities: inventory?.duplicates.length ?? 0,
      orphans: inventory?.orphans.length ?? 0,
      missingAuthority:
        inventory?.missingAuthority.filter((m) => m.reason !== "no_google")
          .length ?? 0,
      credentialVerifyFailures: connections
        ? connections.results.filter(
            (r) =>
              !options.dryRun &&
              (r.action === "created" || r.action === "updated") &&
              !r.credentialVerified,
          ).length
        : 0,
      deltaCreates,
      deltaUpdates,
    },
  };
}
