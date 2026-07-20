import { syncServiceIdentity } from "@sync/service-identity";

// Entry point for the Compass Sync service (ledger S07). Intentionally inert:
// the scaffold builds and starts but does no provider, storage, or HTTP work
// yet. Configuration (S08), process lifecycle/health (S09), internal auth
// (S10), and isolated Mongo storage (S11) land in later commits. This keeps
// the standalone package deployable and type-checked before it does anything
// user-facing (00-architecture-overview.md "Deployment and scaling").

export function describeSyncService(): string {
  return `${syncServiceIdentity.name} scaffold ready`;
}

// Only run when invoked directly (bun packages/sync/src/app.ts), not on import
// from tests.
if (import.meta.main) {
  console.log(describeSyncService());
}
