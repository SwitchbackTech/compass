import { getSyncServiceClient } from "./sync-service.factory";

export type EventDelegation = "legacy" | "sync";

/**
 * Whether the browser-facing calendar/event reads and durable write commands
 * delegate to the Sync service. Every deployment delegates once Sync is
 * configured — there is no more legacy-vs-sync choice — but this still fails
 * safe to "legacy" if a Sync client somehow isn't configured, rather than
 * routing to nothing.
 */
export function resolveEventDelegation(input: {
  hasSyncClient: boolean;
}): EventDelegation {
  return input.hasSyncClient ? "sync" : "legacy";
}

/** Resolve delegation from the process config's client singleton. */
export function getEventDelegation(): EventDelegation {
  return resolveEventDelegation({
    hasSyncClient: getSyncServiceClient() !== null,
  });
}
