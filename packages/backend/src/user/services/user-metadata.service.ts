import mergeWith from "lodash.mergewith";
import {
  type GoogleConnectionState,
  type GoogleSyncConnectionSummary,
  type UserMetadata,
} from "@core/types/user.types";
import { getUserMetadataStore } from "@backend/auth/ports/supertokens.registry";
import { getConnectionDelegation } from "@backend/common/services/sync-service/connection-routing";
import { resolveGoogleConnectionFromSync } from "@backend/common/services/sync-service/google-connection-status";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { isGoogleSyncActive } from "@backend/sync/services/google-sync/google-sync.activity";
import { isGoogleCalendarSyncHealthy } from "@backend/sync/services/google-sync/google-sync.health";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { type GetUserMetadataResponse } from "@backend/user/types/user.types";

type GoogleMetadataAssessment = {
  connectionState: GoogleConnectionState;
  connection?: GoogleSyncConnectionSummary | null;
};

const legacyEmailUpdatesKey = "subscribeToUpdates";

function hasLegacyEmailUpdatesMetadata(
  metadata: Partial<UserMetadata>,
): boolean {
  return Object.hasOwn(metadata, legacyEmailUpdatesKey);
}

function removeLegacyEmailUpdatesMetadata<T extends Partial<UserMetadata>>(
  metadata: T,
): T {
  const { [legacyEmailUpdatesKey]: _, ...cleanMetadata } =
    metadata as UserMetadata & Record<string, unknown>;

  return cleanMetadata as T;
}

class UserMetadataService {
  private getStoredUserMetadata = async (
    userId: string,
    _userContext?: Record<string, unknown>,
  ): Promise<UserMetadata> => {
    const result = (await getUserMetadataStore().getUserMetadata(
      userId,
    )) as GetUserMetadataResponse;

    if (result.status !== "OK")
      throw new Error("Failed to fetch user metadata");

    return result.metadata;
  };

  assessGoogleMetadata = async (
    userId: string,
    metadata?: UserMetadata,
  ): Promise<GoogleMetadataAssessment> => {
    // When this deployment routes provider connections to the sync service, the
    // connection state is owned there, not by the legacy google sub-doc, so
    // derive it from sync. getConnectionDelegation() only returns "sync" once a
    // client is configured (it fails safe to "legacy" otherwise), so a client is
    // present here; the guard keeps this defensive.
    if (getConnectionDelegation() === "sync") {
      const client = getSyncServiceClient();
      if (client) {
        return resolveGoogleConnectionFromSync(client, toSyncPrincipal(userId));
      }
    }

    const storedMetadata =
      metadata ?? (await this.getStoredUserMetadata(userId));
    const user = await findCompassUserBy("_id", userId);
    const googleId = user?.google?.googleId;
    const hasRefreshToken = Boolean(user?.google?.gRefreshToken);

    if (!googleId) {
      return { connectionState: "NOT_CONNECTED" };
    }

    if (!hasRefreshToken) {
      return { connectionState: "RECONNECT_REQUIRED" };
    }

    if (isGoogleSyncActive(userId)) {
      return { connectionState: "IMPORTING" };
    }

    const importStatus = storedMetadata.sync?.importGCal;
    if (importStatus === "IMPORTING" || importStatus === "RESTART") {
      return { connectionState: "ATTENTION" };
    }

    const isHealthy = await isGoogleCalendarSyncHealthy(userId);
    if (isHealthy) {
      return { connectionState: "HEALTHY" };
    }

    return { connectionState: "ATTENTION" };
  };

  /*
   * updateUserMetadata
   *
   * Nested objects and all lower-level properties
   * will merge with existing ones.
   *
   * @memberOf UserMetadataService
   */
  updateUserMetadata = async ({
    userId,
    data,
  }: {
    userId: string;
    data: Partial<UserMetadata>;
  }): Promise<UserMetadata> => {
    const storedMetadata = await this.getStoredUserMetadata(userId);
    const value = hasLegacyEmailUpdatesMetadata(storedMetadata)
      ? removeLegacyEmailUpdatesMetadata(storedMetadata)
      : storedMetadata;
    const cleanData = hasLegacyEmailUpdatesMetadata(data)
      ? removeLegacyEmailUpdatesMetadata(data)
      : data;

    const update = mergeWith(value, cleanData) as UserMetadata;

    const result = (await getUserMetadataStore().updateUserMetadata(
      userId,
      update,
    )) as GetUserMetadataResponse;

    if (result.status !== "OK")
      throw new Error("Failed to update user metadata");

    return hasLegacyEmailUpdatesMetadata(result.metadata)
      ? removeLegacyEmailUpdatesMetadata(result.metadata)
      : result.metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, unknown>,
    options?: { skipAssessment?: boolean },
  ): Promise<UserMetadata> => {
    const storedMetadata = await this.getStoredUserMetadata(
      userId,
      userContext,
    );
    const metadata = hasLegacyEmailUpdatesMetadata(storedMetadata)
      ? removeLegacyEmailUpdatesMetadata(storedMetadata)
      : storedMetadata;

    if (options?.skipAssessment) {
      const user = await findCompassUserBy("_id", userId);
      const googleId = user?.google?.googleId;
      const hasRefreshToken = Boolean(user?.google?.gRefreshToken);

      const connectionState: GoogleConnectionState = !googleId
        ? "NOT_CONNECTED"
        : !hasRefreshToken
          ? "RECONNECT_REQUIRED"
          : (metadata.google?.connectionState ?? "ATTENTION");

      return {
        ...metadata,
        google: { connectionState },
      };
    }

    const { connectionState, connection } = await this.assessGoogleMetadata(
      userId,
      metadata,
    );

    // Cast: SuperTokens JSONObject's index signature doesn't accept our nested
    // google.connection summary type even though every field is JSON-safe.
    return {
      ...metadata,
      google: {
        connectionState,
        ...(connection !== undefined ? { connection } : {}),
      },
    } as UserMetadata;
  };
}

export default new UserMetadataService();
