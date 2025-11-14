import { ObjectId } from "bson";
import { mkdtemp, readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import supertokens from "supertokens-node";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { initSupertokens } from "@backend/common/middleware/supertokens.middleware";
import mongoService from "@backend/common/services/mongo.service";

export default class Seeder implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.11.14T10.30.28.map-user-id-to-supertoken-id";
  readonly path: string = "2025.11.14T10.30.28.map-user-id-to-supertoken-id.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { context } = params;
    const { logger } = context;

    const tmpDir = await mkdtemp(path.join(tmpdir(), this.name));
    const file = path.join(tmpDir, "map.json");
    const contents = await readFile(file, "utf-8").catch(() => "[]");
    const map: string[] = JSON.parse(contents);
    const mapped: string[] = [];
    const userIds = map.map((id) => new ObjectId(id));

    logger.info(`Found ${map.length} mapped users`);

    const users = await mongoService.user
      .find({ _id: { $nin: userIds } }, { projection: { _id: 1 } })
      .toArray();

    if (users.length === 0) {
      logger.info("No users to map. Exiting.");

      return;
    }

    initSupertokens();

    const { default: pLimit } = await import("p-limit"); // esm module support
    // Limit concurrency to avoid resource exhaustion and API rate limits
    const limit = pLimit(50); // Adjust concurrency as needed

    const run = await Promise.all(
      users.map(async ({ _id }) =>
        limit(async () => {
          const userId = _id.toString();
          const userMap = await supertokens.getUserIdMapping({ userId });
          const mappingNotFound = userMap.status === "UNKNOWN_MAPPING_ERROR";

          const { externalUserId, superTokensUserId } = mappingNotFound
            ? {}
            : userMap;

          const alreadyMapped = externalUserId === userId;

          if (alreadyMapped) {
            logger.info(
              `Compass user(${userId}) already mapped to Supertokens user(${superTokensUserId})`,
            );

            return mapped.push(userId);
          }

          return supertokens
            .createUserIdMapping({
              superTokensUserId: superTokensUserId!,
              externalUserId: userId,
              externalUserIdInfo: "Compass User ID",
              force: true,
            })
            .then(() => mapped.push(userId))
            .catch((error) => {
              logger.error(
                `Failed to map Compass user(${userId}) to Supertokens user ${superTokensUserId}:`,
                error,
              );

              return mapped.length;
            });
        }),
      ),
    );

    const mappedUsers = Math.max(...run);

    logger.info(`Mapped ${mappedUsers} out of ${users.length} users.`);

    const isComplete = mappedUsers === users.length;

    if (isComplete) {
      logger.info("Mapping complete. Removing temporary file.");

      await unlink(file).catch(() => null);
    } else {
      await writeFile(
        file,
        JSON.stringify([...map, ...mapped], null, 2),
        "utf-8",
      );

      logger.info(`Mapping incomplete. Run this seed to resume mapping.`);
    }
  }

  async down(): Promise<void> {
    return Promise.resolve();
  }
}
