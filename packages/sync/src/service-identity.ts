// Stable identity for the Compass Sync service (ledger S07). Kept as a plain
// constant so health telemetry (S44) and internal-auth (S10) can reference one
// canonical service name rather than string literals. PostHog's `service.name`
// dimension uses this value (04-security-and-observability.md).
export const SYNC_SERVICE_NAME = "compass-sync";

export interface SyncServiceIdentity {
  readonly name: string;
}

export const syncServiceIdentity: SyncServiceIdentity = {
  name: SYNC_SERVICE_NAME,
};
