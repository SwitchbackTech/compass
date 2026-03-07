import mergeWith from "lodash.mergewith";
import SupertokensUserMetadata from "supertokens-node/recipe/usermetadata";
import { Logger } from "@core/logger/winston.logger";
import { type UserMetadata } from "@core/types/user.types";
import mongoService from "@backend/common/services/mongo.service";
import { getSync } from "@backend/sync/util/sync.queries";
import { findCompassUserBy } from "@backend/user/queries/user.queries";
import {
  getGoogleConnectionStatus,
  getGoogleSyncStatus,
  hasHealthyGoogleSync,
} from "@backend/user/services/google/google.status.util";

const logger = Logger("app:google.sync-repair.service");

class GoogleSyncRepairService {
  #scheduledUsers = new Set<string>();

  ensureRepairScheduled = async (userId: string): Promise<boolean> => {
    if (this.#scheduledUsers.has(userId)) return false;

    const user = await findCompassUserBy("_id", userId);
    const connectionStatus = getGoogleConnectionStatus(user);

    if (connectionStatus !== "connected") {
      return false;
    }

    const { status, metadata } =
      await SupertokensUserMetadata.getUserMetadata(userId);

    if (status !== "OK") {
      throw new Error("Failed to fetch user metadata");
    }

    const typedMetadata = metadata as UserMetadata;
    const importStatus = typedMetadata.sync?.importGCal;

    if (
      importStatus === "importing" ||
      importStatus === "restart" ||
      importStatus === "errored"
    ) {
      return false;
    }

    const sync = await getSync({ userId });
    const watches = await mongoService.watch.find({ user: userId }).toArray();
    const isHealthy = hasHealthyGoogleSync(sync, watches);
    const syncStatus = getGoogleSyncStatus({
      connectionStatus,
      importStatus,
      isHealthy,
    });

    if (syncStatus === "healthy") {
      return false;
    }

    const updatedMetadata = mergeWith({}, typedMetadata, {
      sync: { importGCal: "restart" },
    });
    const updateResult = await SupertokensUserMetadata.updateUserMetadata(
      userId,
      updatedMetadata,
    );

    if (updateResult.status !== "OK") {
      throw new Error("Failed to update user metadata");
    }

    this.#scheduledUsers.add(userId);

    void import("@backend/user/services/user.service")
      .then(({ default: userService }) =>
        userService.restartGoogleCalendarSync(userId, { force: true }),
      )
      .catch((err) => {
        logger.error(
          `Something went wrong repairing Google calendars for user: ${userId}`,
          err,
        );
      })
      .finally(() => {
        this.#scheduledUsers.delete(userId);
      });

    return true;
  };
}

export default new GoogleSyncRepairService();
