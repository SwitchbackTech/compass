import { type NodeEnv } from "@core/constants/core.constants";

// Stable identity for the Compass Sync service (ledger S07/S09). Kept as a plain
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

// Structured identity surfaced on liveness responses and (later) health
// telemetry. Environment and execution mode let an operator confirm which
// deployment and rollout state answered a probe.
export interface StructuredServiceIdentity {
  readonly name: string;
  readonly environment: NodeEnv;
  readonly execution: "passive" | "active";
}

export function buildServiceIdentity(input: {
  environment: NodeEnv;
  execution: "passive" | "active";
}): StructuredServiceIdentity {
  return {
    name: SYNC_SERVICE_NAME,
    environment: input.environment,
    execution: input.execution,
  };
}
