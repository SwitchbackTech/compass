import mergeWith from "lodash/mergeWith";
import {
  type GoogleConnectionState,
  type UserMetadata,
} from "@core/types/user.types";
import { getUserMetadataStore } from "@backend/auth/ports/supertokens.registry";
import {
  type GoogleConnectionFromSync,
  resolveGoogleConnectionFromSync,
} from "@backend/common/services/sync-service/google-connection-status";
import { toSyncPrincipal } from "@backend/common/services/sync-service/sync-principal";
import { getSyncServiceClient } from "@backend/common/services/sync-service/sync-service.factory";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { type GetUserMetadataResponse } from "@backend/user/types/user.types";

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
  ): Promise<GoogleConnectionFromSync> => {
    const client = getSyncServiceClient();
    return resolveGoogleConnectionFromSync(client, toSyncPrincipal(userId));
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

    const { connectionState, connections } =
      await this.assessGoogleMetadata(userId);

    return {
      ...metadata,
      google: {
        connectionState,
        ...(connections !== undefined ? { connections } : {}),
      },
    };
  };
}

export default new UserMetadataService();
