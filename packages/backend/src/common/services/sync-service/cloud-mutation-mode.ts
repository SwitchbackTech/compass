import { CONFIG } from "@backend/common/constants/config.constants";
import { eventMutationError } from "@backend/event/event.error";

export type CloudMutationMode = "enabled" | "maintenance";

/**
 * Global cloud-mutation posture (S50). When `maintenance`, cloud event writes
 * and provider-connection changes reject with a typed MAINTENANCE response.
 * Orthogonal to connection/event routing and Sync execution.
 */
export function getCloudMutationMode(): CloudMutationMode {
  return CONFIG.SYNC_CLOUD_MUTATION_MODE;
}

export function isCloudMutationEnabled(): boolean {
  return getCloudMutationMode() === "enabled";
}

/**
 * Throw a typed MAINTENANCE EventMutationException when cloud mutations are
 * paused. Call at the edge of mutating controllers before any write work.
 */
export function assertCloudMutationsAllowed(): void {
  if (isCloudMutationEnabled()) return;
  throw eventMutationError(
    "MAINTENANCE",
    "Cloud edits are paused for maintenance",
  );
}
