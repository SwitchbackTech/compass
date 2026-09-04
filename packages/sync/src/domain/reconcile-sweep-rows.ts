import { type ProviderKind } from "@core/types/sync/identity.contracts";
import {
  reconcileStaleAfterMsFor,
  reconcileSweepIntervalMsFor,
  type SyncConfig,
} from "@sync/config/sync.config";
import { type ProviderRegistry } from "@sync/providers/provider-registry";
import {
  type ListStaleEventsOptions,
  type SyncResourceRepository,
} from "@sync/storage/repositories/sync-resource.repository";

export interface ReconcileSweepRowSpec {
  readonly name: string;
  readonly windowMs: number;
  readonly intervalMs?: number;
  readonly listOptions: ListStaleEventsOptions;
}

export function pollOnlyProviderKinds(
  registry: ProviderRegistry,
): ProviderKind[] {
  return registry
    .kinds()
    .filter(
      (kind) =>
        !registry.get(kind).capabilities.includes("changeNotifications"),
    );
}

export function buildReconcileSweepRows(
  registry: ProviderRegistry,
  config: SyncConfig,
): ReconcileSweepRowSpec[] {
  const pollOnly = pollOnlyProviderKinds(registry);
  const rows: ReconcileSweepRowSpec[] = [
    {
      name: "reconcile",
      windowMs: -config.RECONCILE_STALE_AFTER_MS,
      listOptions: pollOnly.length > 0 ? { excludeProviders: pollOnly } : {},
    },
  ];
  for (const kind of pollOnly) {
    rows.push({
      name: `reconcile-${kind}`,
      windowMs: -reconcileStaleAfterMsFor(config, kind),
      intervalMs: reconcileSweepIntervalMsFor(config, kind),
      listOptions: { provider: kind },
    });
  }
  return rows;
}

export function listStaleEventsForRow(
  resources: SyncResourceRepository,
  row: ReconcileSweepRowSpec,
): (
  before: Date,
  limit: number,
) => ReturnType<SyncResourceRepository["listStaleEvents"]> {
  return (before, limit) =>
    resources.listStaleEvents(before, limit, row.listOptions);
}
