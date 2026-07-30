import { getSyncServiceClient } from "./sync-service.factory";

export type ConnectionDelegation = "legacy" | "sync";

/**
 * Whether the browser-facing provider-connection routes delegate to the Sync
 * service. Every deployment delegates once Sync is configured — there is no
 * more legacy-vs-sync choice — but this still fails safe to "legacy" if a
 * Sync client somehow isn't configured, rather than routing to nothing.
 */
export function resolveConnectionDelegation(input: {
  hasSyncClient: boolean;
}): ConnectionDelegation {
  return input.hasSyncClient ? "sync" : "legacy";
}

/** Resolve delegation from the process config's client singleton. */
export function getConnectionDelegation(): ConnectionDelegation {
  return resolveConnectionDelegation({
    hasSyncClient: getSyncServiceClient() !== null,
  });
}
