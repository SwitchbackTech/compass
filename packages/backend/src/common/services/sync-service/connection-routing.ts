import { CONFIG } from "@backend/common/constants/config.constants";
import { getSyncServiceClient } from "./sync-service.factory";

export type ConnectionDelegation = "legacy" | "sync";

/**
 * The single decision point for whether the browser-facing provider-connection
 * routes delegate to the Sync service or run the legacy in-backend flow.
 *
 * Global, not per-request: the ledger requires one implementation to own a
 * connection end-to-end, so this resolves from deployment config, never from
 * the request or the user. It fails safe to "legacy" unless an operator both
 * selected "sync" AND a Sync client is actually configured — config validation
 * already enforces that pairing, but the resolver refuses to route to a missing
 * client regardless, so a misconfiguration degrades to legacy rather than 500s.
 */
export function resolveConnectionDelegation(input: {
  routing: ConnectionDelegation;
  hasSyncClient: boolean;
}): ConnectionDelegation {
  return input.routing === "sync" && input.hasSyncClient ? "sync" : "legacy";
}

/** Resolve delegation from the process config + client singleton. */
export function getConnectionDelegation(): ConnectionDelegation {
  return resolveConnectionDelegation({
    routing: CONFIG.SYNC_CONNECTION_ROUTING,
    hasSyncClient: getSyncServiceClient() !== null,
  });
}
