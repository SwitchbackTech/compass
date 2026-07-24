import { CONFIG } from "@backend/common/constants/config.constants";
import { getSyncServiceClient } from "./sync-service.factory";

export type EventDelegation = "legacy" | "sync";

/**
 * The single decision point for whether the browser-facing calendar/event
 * reads and durable write commands delegate to the Sync service or run the
 * legacy in-backend event store.
 *
 * Global, not per-request, and independent of connection routing: an operator
 * can delegate connections while still serving events from legacy (or vice
 * versa), so the riskier event path rolls out on its own schedule. It fails
 * safe to "legacy" unless an operator both selected "sync" AND a Sync client is
 * actually configured — config validation already enforces that pairing, but
 * the resolver refuses to route to a missing client regardless, so a
 * misconfiguration degrades to legacy rather than 500s.
 */
export function resolveEventDelegation(input: {
  routing: EventDelegation;
  hasSyncClient: boolean;
}): EventDelegation {
  return input.routing === "sync" && input.hasSyncClient ? "sync" : "legacy";
}

/** Resolve delegation from the process config + client singleton. */
export function getEventDelegation(): EventDelegation {
  return resolveEventDelegation({
    routing: CONFIG.SYNC_EVENT_ROUTING,
    hasSyncClient: getSyncServiceClient() !== null,
  });
}
