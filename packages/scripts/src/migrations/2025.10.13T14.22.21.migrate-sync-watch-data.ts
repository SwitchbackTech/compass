import { ObjectId, WithId } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { getChannelExpiration } from "@backend/sync/util/sync.util";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.13T14.22.21.migrate-sync-watch-data";
  readonly path: string = "2025.10.13T14.22.21.migrate-sync-watch-data.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const session = await mongoService.startSession();
    // This is a non-destructive migration to copy events watch data
    // from sync collection to watch collection

    const cursor = mongoService.sync.find(
      { "google.events": { $exists: true, $ne: [] } },
      { batchSize: 100, session },
    );

    let migratedCount = 0;

    for await (const syncDoc of cursor) {
      if (!syncDoc.google?.events?.length) continue;

      const watchDocuments: Array<WithId<Omit<Schema_Watch, "_id">>> = [];
      // we will not migrate calendarlist watches as we do not store resourceId
      // for them currently and they are unused
      const syncDocs = syncDoc.google.events;
      const gcal = await getGcalClient(syncDoc.user);
      const expiration = getChannelExpiration();

      await Promise.allSettled([
        ...syncDocs.map(async (s) => {
          await syncService
            .stopWatch(syncDoc.user, s.channelId, s.resourceId, gcal)
            .catch(logger.error);

          const _id = new ObjectId();
          const channelId = _id.toString();

          const { watch } = await gcalService.watchEvents(gcal, {
            channelId,
            expiration,
            gCalendarId: s.gCalendarId,
            nextSyncToken: s.nextSyncToken,
          });

          watchDocuments.push(
            WatchSchema.parse({
              _id,
              user: syncDoc.user,
              resourceId: watch.resourceId!,
              expiration: new Date(parseInt(watch.expiration!)),
              createdAt: new Date(), // Set current time as creation time for migration
            }),
          );
        }),
      ]);

      const result = await mongoService.watch.insertMany(watchDocuments, {
        session,
      });

      migratedCount += result.insertedCount;
    }

    logger.info(
      `Migrated ${migratedCount} events watch channels to watch collection`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    // This is a non-destructive migration, we don't remove the data from watch collection
    // because it might have been updated or new watches might have been added
    logger.info("Non-destructive migration: watch collection data left intact");
  }
}
