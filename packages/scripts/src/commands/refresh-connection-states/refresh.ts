import { type Db } from "mongodb";
import { deriveConnectionState } from "@sync/domain/connection-state";
import {
  gatherConnectionStateEvidence,
  refreshConnectionState,
} from "@sync/domain/connection-state-refresh.service";
import { SYNC_COLLECTIONS } from "@sync/storage/collections";
import { ProviderConnectionRecordSchema } from "@sync/storage/contracts/provider-connection.contracts";
import { CredentialRepository } from "@sync/storage/repositories/credential.repository";
import { InvalidationRepository } from "@sync/storage/repositories/invalidation.repository";
import { JobRepository } from "@sync/storage/repositories/job.repository";
import { ProviderCalendarRepository } from "@sync/storage/repositories/provider-calendar.repository";
import { ProviderConnectionRepository } from "@sync/storage/repositories/provider-connection.repository";
import { SyncResourceRepository } from "@sync/storage/repositories/sync-resource.repository";

export type RefreshConnectionStatesReport = {
  generatedAt: string;
  dryRun: boolean;
  scanned: number;
  changed: number;
  transitions: Record<string, number>;
  samples: Array<{
    id: string;
    from: string;
    to: string;
    reason: string | null;
  }>;
};

/**
 * Re-derive every provider connection's stored state from live evidence (the
 * same derivation `GET /internal/connections` already runs on each fetch — see
 * connection-state-refresh.service.ts). Connections normally self-heal the
 * first time their owner loads the app; this exists to catch up connections
 * stuck on a stale stored state (e.g. "importing" from a preseed migration)
 * ahead of that, for accurate dashboards/ops queries. Safe to rerun — a
 * connection already showing its derived state is left untouched.
 */
export async function refreshConnectionStates(
  db: Db,
  options: { dryRun: boolean; limit?: number } = { dryRun: true },
): Promise<RefreshConnectionStatesReport> {
  const limit = options.limit ?? Infinity;
  const connections = new ProviderConnectionRepository(db);
  const refreshDeps = {
    connections,
    calendars: new ProviderCalendarRepository(db),
    resources: new SyncResourceRepository(db),
    credentials: new CredentialRepository(db),
    jobs: new JobRepository(db),
    invalidations: new InvalidationRepository(db),
  };

  const transitions: Record<string, number> = {};
  const samples: Array<{
    id: string;
    from: string;
    to: string;
    reason: string | null;
  }> = [];
  let scanned = 0;
  let changed = 0;

  const cursor = db.collection(SYNC_COLLECTIONS.providerConnections).find({});
  for await (const doc of cursor) {
    scanned += 1;
    const record = ProviderConnectionRecordSchema.parse(doc);

    if (options.dryRun) {
      const evidence = await gatherEvidenceOnly(refreshDeps, record);
      if (evidence.state === record.state) continue;
      changed += 1;
      recordTransition(
        transitions,
        samples,
        record,
        evidence.state,
        evidence.reason,
      );
    } else {
      const updated = await refreshConnectionState(refreshDeps, record);
      if (updated.state === record.state) continue;
      changed += 1;
      recordTransition(
        transitions,
        samples,
        record,
        updated.state,
        updated.stateReason,
      );
    }
    if (changed >= limit) break;
  }

  return {
    generatedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    scanned,
    changed,
    transitions,
    samples,
  };
}

function recordTransition(
  transitions: Record<string, number>,
  samples: Array<{
    id: string;
    from: string;
    to: string;
    reason: string | null;
  }>,
  record: { _id: string; state: string },
  to: string,
  reason: string | null,
): void {
  const key = `${record.state}->${to}`;
  transitions[key] = (transitions[key] ?? 0) + 1;
  if (samples.length < 20) {
    samples.push({ id: record._id, from: record.state, to, reason });
  }
}

// Dry-run needs the derived state WITHOUT persisting — refreshConnectionState
// always writes on a mismatch, so dry-run re-derives the same evidence
// in-memory instead of calling it.
async function gatherEvidenceOnly(
  deps: Parameters<typeof refreshConnectionState>[0],
  record: Parameters<typeof refreshConnectionState>[1],
): Promise<{ state: string; reason: string | null }> {
  const now = new Date();
  const evidence = await gatherConnectionStateEvidence(deps, record, now);
  const derived = deriveConnectionState(evidence, now);
  return { state: derived.state, reason: derived.reason };
}
