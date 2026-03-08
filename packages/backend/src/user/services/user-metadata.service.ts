import mergeWith from "lodash.mergewith";
import SupertokensUserMetadata, {
  type JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { Resource_Sync } from "@core/types/sync.types";
import {
  type GoogleConnectionStatus,
  type GoogleSyncStatus,
  type Schema_User,
  type UserMetadata,
} from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";
import mongoService from "@backend/common/services/mongo.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { isUsingHttps } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

type GoogleMetadataAssessment = {
  hasRefreshToken: boolean;
  connectionStatus: GoogleConnectionStatus;
  syncStatus: GoogleSyncStatus;
};

class UserMetadataService {
  private getStoredUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const { status, metadata } = await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    );

    if (status !== "OK") throw new Error("Failed to fetch user metadata");

    return metadata as UserMetadata;
  };

  private getGoogleConnectionStatus(
    user?: Schema_User | null,
  ): GoogleConnectionStatus {
    const googleId = user?.google?.googleId;
    const hasRefreshToken = Boolean(user?.google?.gRefreshToken);

    if (!googleId) return "not_connected";
    if (!hasRefreshToken) return "reconnect_required";

    return "connected";
  }

  private async isGoogleSyncHealthy(userId: string): Promise<boolean> {
    const sync = await getSync({ userId });

    if (!sync?.google) {
      return false;
    }

    const eventSyncs = sync.google.events ?? [];
    const calendarListSyncs = sync.google.calendarlist ?? [];

    if (eventSyncs.length === 0 || calendarListSyncs.length === 0) {
      return false;
    }

    if (calendarListSyncs.some(({ nextSyncToken }) => !nextSyncToken)) {
      return false;
    }

    if (eventSyncs.some(({ nextSyncToken }) => !nextSyncToken)) {
      return false;
    }

    if (!isUsingHttps()) {
      return true;
    }

    const activeWatchCalendarIds = new Set(
      (await mongoService.watch.find({ user: userId }).toArray())
        .filter(({ expiration }) => dayjs(expiration).isAfter(dayjs()))
        .map(({ gCalendarId }) => gCalendarId),
    );

    if (!activeWatchCalendarIds.has(Resource_Sync.CALENDAR)) {
      return false;
    }

    return eventSyncs.every(({ gCalendarId }) =>
      activeWatchCalendarIds.has(gCalendarId),
    );
  }

  assessGoogleMetadata = async (
    userId: string,
    metadata?: UserMetadata,
  ): Promise<GoogleMetadataAssessment> => {
    const storedMetadata =
      metadata ?? (await this.getStoredUserMetadata(userId));
    const user = await findCompassUserBy("_id", userId);
    const hasRefreshToken = Boolean(user?.google?.gRefreshToken);
    const connectionStatus = this.getGoogleConnectionStatus(user);

    if (connectionStatus !== "connected") {
      return {
        hasRefreshToken,
        connectionStatus,
        syncStatus: "none",
      };
    }

    const importStatus = storedMetadata.sync?.importGCal;

    if (importStatus === "importing" || importStatus === "restart") {
      return {
        hasRefreshToken,
        connectionStatus,
        syncStatus: "repairing",
      };
    }

    const isHealthy = await this.isGoogleSyncHealthy(userId);

    if (isHealthy) {
      return {
        hasRefreshToken,
        connectionStatus,
        syncStatus: "healthy",
      };
    }

    if (importStatus === "errored") {
      return {
        hasRefreshToken,
        connectionStatus,
        syncStatus: "attention",
      };
    }

    return {
      hasRefreshToken,
      connectionStatus,
      syncStatus: "attention",
    };
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
    const value = await this.getStoredUserMetadata(userId);
    const update = mergeWith(value, data);

    const { status, metadata } =
      await SupertokensUserMetadata.updateUserMetadata(userId, update);

    if (status !== "OK") throw new Error("Failed to update user metadata");

    return metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
    options?: { skipAssessment?: boolean },
  ): Promise<UserMetadata> => {
    const metadata = await this.getStoredUserMetadata(userId, userContext);

    if (options?.skipAssessment) {
      const user = await findCompassUserBy("_id", userId);
      const hasRefreshToken = Boolean(user?.google?.gRefreshToken);
      const connectionStatus = this.getGoogleConnectionStatus(user);

      return {
        ...metadata,
        google: {
          ...metadata.google,
          hasRefreshToken,
          connectionStatus,
          syncStatus: metadata.google?.syncStatus ?? "none",
        },
      };
    }

    const google = await this.assessGoogleMetadata(userId, metadata);

    return {
      ...metadata,
      google: {
        ...metadata.google,
        hasRefreshToken: google.hasRefreshToken,
        connectionStatus: google.connectionStatus,
        syncStatus: google.syncStatus,
      },
    };
  };
}

export default new UserMetadataService();
