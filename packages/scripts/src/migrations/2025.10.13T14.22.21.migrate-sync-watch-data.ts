import { ObjectId, WithId } from "mongodb";
import type { MigrationParams, RunnableMigration } from "umzug";
import { z } from "zod/v4";
import { MigrationContext } from "@scripts/common/cli.types";
import { Resource_Sync } from "@core/types/sync.types";
import { ExpirationDateSchema } from "@core/types/type.utils";
import { Schema_Watch, WatchSchema } from "@core/types/watch.types";
import { getGcalClient } from "@backend/auth/services/google.auth.service";
import gcalService from "@backend/common/services/gcal/gcal.service";
import mongoService from "@backend/common/services/mongo.service";
import syncService from "@backend/sync/services/sync.service";
import { getChannelExpiration } from "@backend/sync/util/sync.util";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.13T14.22.21.migrate-sync-watch-data";
  readonly path: string = "2025.10.13T14.22.21.migrate-sync-watch-data.ts";
  static readonly OldSyncDetailsSchema = z.object({
    gCalendarId: z.string().nonempty(),
    channelId: z.string().nonempty(),
    resourceId: z.string().nonempty(),
    nextSyncToken: z.string().optional(),
    nextPageToken: z.string().optional(),
    expiration: z.string().optional(),
    createdAt: z.date().optional(),
    lastSyncedAt: z.date().optional(),
    lastRefreshedAt: z.date().optional(),
  });

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    // This is a non-destructive migration to copy events watch data
    // from sync collection to watch collection.
    // We will not migrate calendarlist watches as we do not store resourceId
    // for them currently and they are unused.
    // We will only migrate events watches that have not expired
    const cursor = mongoService.sync.find(
      {
        "google.events": { $exists: true, $ne: [] },
        "google.events.expiration": { $exists: true },
      },
      { batchSize: 100 },
    );

    let migratedCount = 0;

    while (await cursor.hasNext()) {
      const syncDoc = await cursor.next();

      if (!syncDoc) continue;
      if ((syncDoc?.google?.events?.length ?? 0) < 1) continue;

      const watchDocuments: Array<WithId<Omit<Schema_Watch, "_id">>> = [];

      const syncDocs = syncDoc.google.events
        .map((doc) => Migration.OldSyncDetailsSchema.safeParse(doc).data)
        .filter((d) => ExpirationDateSchema.safeParse(d?.expiration).success)
        .filter((doc) => doc !== undefined);

      const gcal = await getGcalClient(syncDoc.user);
      const expiration = getChannelExpiration();
      const quotaUser = new ObjectId().toString();

      await Promise.allSettled([
        ...syncDocs.map(async (s) => {
          await syncService
            .stopWatch(syncDoc.user, s.channelId, s.resourceId, gcal, quotaUser)
            .catch(logger.error);

          const { watch } = await gcalService.watchEvents(gcal, {
            channelId: new ObjectId().toString(),
            expiration,
            gCalendarId: s.gCalendarId,
            quotaUser,
          });

          if (!watch.id) return;

          watchDocuments.push(
            WatchSchema.parse({
              _id: new ObjectId(watch.id),
              user: syncDoc.user,
              resourceId: watch.resourceId!,
              gCalendarId: s.gCalendarId,
              expiration: watch.expiration,
              createdAt: new Date(), // Set current time as creation time for migration
            }),
          );
        }),
        gcalService
          .watchCalendars(gcal, {
            channelId: new ObjectId().toString(),
            expiration,
            quotaUser,
          })
          .then(({ watch }) => {
            if (!watch.id) return;

            watchDocuments.push(
              WatchSchema.parse({
                _id: new ObjectId(watch.id),
                user: syncDoc.user,
                resourceId: watch.resourceId!,
                gCalendarId: Resource_Sync.CALENDAR,
                expiration: watch.expiration,
                createdAt: new Date(), // Set current time as creation time for migration
              }),
            );
          }),
      ]);

      if (watchDocuments.length > 0) {
        const result = await mongoService.watch.insertMany(watchDocuments, {
          ordered: false,
        });

        migratedCount += result.insertedCount;
      }
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
