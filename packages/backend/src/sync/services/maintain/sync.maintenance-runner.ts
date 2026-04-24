import { type ObjectId } from "mongodb";
import { Logger } from "@core/logger/winston.logger";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";
import {
  prepWatchMaintenanceForUser,
  pruneSync,
  refreshWatch,
} from "@backend/sync/services/maintain/sync.maintenance";
import { createConcurrencyLimiter } from "@backend/sync/util/sync.util";
import { findCompassUserBy } from "@backend/user/queries/user.queries";

const logger = Logger("app:sync.maintenance-runner");

class SyncMaintenanceRunner {
  runMaintenance = async () => {
    const cursor = mongoService.user.find().batchSize(MONGO_BATCH_SIZE);
    const users: ObjectId[] = [];
    const result = {
      deleted: 0,
      refreshed: 0,
      ignored: 0,
      pruned: 0,
      revoked: 0,
      resynced: 0,
    };

    for await (const user of cursor) {
      users.push(user._id);
    }

    const limit = createConcurrencyLimiter(5);

    const run = await Promise.all(
      users.map((user) =>
        limit(() =>
          this.runMaintenanceByUser(user.toString(), {
            log: false,
          }).catch((error) => {
            logger.error(
              `Error running sync maintenance for user: ${user.toString()}`,
              error,
            );

            return {
              ignore: [{ user: user.toString(), payload: [] }],
              prune: [{ user: user.toString(), payload: [] }],
              refresh: [{ user: user.toString(), payload: [] }],
              ...result,
            };
          }),
        ),
      ),
    );

    const results = run.reduce(
      (acc, res) => ({
        deleted: acc.deleted + res.deleted,
        refreshed: acc.refreshed + res.refreshed,
        ignored: acc.ignored + res.ignored,
        pruned: acc.pruned + res.pruned,
        revoked: acc.revoked + res.revoked,
        resynced: acc.resynced + res.resynced,
      }),
      result,
    );

    logger.debug(`Sync Maintenance Results:
      IGNORED: ${results.ignored}
      PRUNED: ${results.pruned}
      REFRESHED: ${results.refreshed}

      DELETED DURING PRUNE: ${results.deleted}
      REVOKED SESSION DURING REFRESH: ${results.revoked}
      RESYNCED DURING REFRESH: ${results.resynced}
    `);

    return results;
  };

  runMaintenanceByUser = async (
    userId: string,
    params: { dry?: boolean; log?: boolean } = { log: true },
  ) => {
    const user = await findCompassUserBy("_id", userId);
    const maintenance = await prepWatchMaintenanceForUser(userId);
    const ignore = [{ user: userId, payload: maintenance.ignore }];
    const prune = [{ user: userId, payload: maintenance.prune }];
    const refresh = [{ user: userId, payload: maintenance.refresh }];

    const result = {
      ignore,
      prune,
      refresh,
      user: user?.email || "Not found",
      ignored: 0,
      pruned: 0,
      refreshed: 0,
      revoked: 0,
      deleted: 0,
      resynced: 0,
    };

    if (params?.dry) return result;

    const pruneResult = await pruneSync(prune);
    const pruned = pruneResult.filter((p) => !p.deletedUserData);
    const deletedDuringPrune = pruneResult.filter((p) => p.deletedUserData);
    const refreshResult = await refreshWatch(refresh);
    const refreshed = refreshResult;
    const resynced = refreshResult.filter((r) => r.resynced);

    if (params?.log) {
      logger.debug(`Sync Maintenance Results:
        IGNORED: ${ignore.length}
        PRUNED: ${pruned.flatMap((p) => p.results).length}
        REFRESHED: ${refreshed.flatMap((r) => r.results.filter((r) => r.success)).length}

        DELETED DURING PRUNE: ${deletedDuringPrune.map((r) => r.user).toString()}
        RESYNCED DURING REFRESH: ${resynced.map((r) => r.user).toString()}
      `);
    }

    return {
      ...result,
      ignored: ignore.flatMap(({ payload }) => payload).length,
      pruned: pruned.flatMap(({ results }) => results).length,
      refreshed: refreshed.flatMap(({ results }) =>
        results.filter((r) => r.success),
      ).length,
      deleted: deletedDuringPrune.length,
      resynced: resynced.length,
    };
  };
}

export const syncMaintenanceRunner = new SyncMaintenanceRunner();
export default syncMaintenanceRunner;
