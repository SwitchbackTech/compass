import mergeWith from "lodash.mergewith";
import SupertokensUserMetadata, {
  type JSONObject,
} from "supertokens-node/recipe/usermetadata";
import { Resource_Sync } from "@core/types/sync.types";
import {
  type GoogleConnectionState,
  type UserMetadata,
} from "@core/types/user.types";
import dayjs from "@core/util/date/dayjs";
import mongoService from "@backend/common/services/mongo.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { isUsingGcalWebhookHttps } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import { type GetUserMetadataResponse } from "@backend/user/types/user.types";

type GoogleMetadataAssessment = {
  connectionState: GoogleConnectionState;
};

class UserMetadataService {
  private getStoredUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
  ): Promise<UserMetadata> => {
    const result = (await SupertokensUserMetadata.getUserMetadata(
      userId,
      userContext,
    )) as GetUserMetadataResponse;

    if (result.status !== "OK")
      throw new Error("Failed to fetch user metadata");

    return result.metadata;
  };

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

    if (!isUsingGcalWebhookHttps()) {
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
    const googleId = user?.google?.googleId;
    const hasRefreshToken = Boolean(user?.google?.gRefreshToken);

    if (!googleId) {
      return { connectionState: "NOT_CONNECTED" };
    }

    if (!hasRefreshToken) {
      return { connectionState: "RECONNECT_REQUIRED" };
    }

    const importStatus = storedMetadata.sync?.importGCal;
    if (importStatus === "IMPORTING") {
      return { connectionState: "IMPORTING" };
    }

    if (importStatus === "RESTART") {
      return { connectionState: "ATTENTION" };
    }

    const isHealthy = await this.isGoogleSyncHealthy(userId);
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
    const value = await this.getStoredUserMetadata(userId);
    const update = mergeWith(value, data) as UserMetadata;

    const result = (await SupertokensUserMetadata.updateUserMetadata(
      userId,
      update,
    )) as GetUserMetadataResponse;

    if (result.status !== "OK")
      throw new Error("Failed to update user metadata");

    return result.metadata;
  };

  fetchUserMetadata = async (
    userId: string,
    userContext?: Record<string, JSONObject>,
    options?: { skipAssessment?: boolean },
  ): Promise<UserMetadata> => {
    const metadata = await this.getStoredUserMetadata(userId, userContext);

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

    const { connectionState } = await this.assessGoogleMetadata(
      userId,
      metadata,
    );

    return {
      ...metadata,
      google: { connectionState },
    };
  };
}

export default new UserMetadataService();
