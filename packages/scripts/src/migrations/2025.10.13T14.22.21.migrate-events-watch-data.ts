import type { RunnableMigration } from "umzug";
import { MigrationContext } from "@scripts/common/cli.types";
import { Watch } from "@core/types/watch.types";
import mongoService from "@backend/common/services/mongo.service";
import dayjs from "../../../core/src/util/date/dayjs";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2025.10.13T14.22.21.migrate-events-watch-data";
  readonly path: string = "2025.10.13T14.22.21.migrate-events-watch-data.ts";

  async up(): Promise<void> {
    const session = await mongoService.startSession();
    // This is a non-destructive migration to copy events watch data from sync collection to watch collection

    const cursor = mongoService.sync.find(
      { "google.events": { $exists: true, $ne: [] } },
      { batchSize: 100, session },
    );

    let migratedCount = 0;

    for await (const syncDoc of cursor) {
      if (!syncDoc.google?.events?.length) continue;

      const watchDocuments: Watch[] = [];

      for (const eventSync of syncDoc.google.events) {
        if (
          !eventSync.channelId ||
          !eventSync.resourceId ||
          !eventSync.expiration
        ) {
          continue; // Skip incomplete watch data
        }

        // Convert expiration string to Date
        let expirationDate: Date;

        try {
          // Google Calendar expiration is typically a timestamp in milliseconds
          const expirationMs = parseInt(eventSync.expiration);

          if (isNaN(expirationMs)) {
            console.warn(
              `Invalid expiration ms for channelId ${eventSync.channelId}: ${eventSync.expiration}`,
            );
            continue;
          }

          expirationDate = dayjs(expirationMs).toDate();
        } catch {
          // If parsing fails, skip this watch entry
          console.warn(
            `Invalid expiration format for channelId ${eventSync.channelId}: ${eventSync.expiration}`,
          );
          continue;
        }

        const watchDoc: Watch = {
          _id: eventSync.channelId,
          user: syncDoc.user,
          resourceId: eventSync.resourceId,
          expiration: expirationDate,
          createdAt: new Date(), // Set current time as creation time for migration
        };

        watchDocuments.push(watchDoc);
      }

      if (watchDocuments.length > 0) {
        try {
          // Use insertMany with ordered: false to continue on duplicates
          const result = await mongoService.watch.insertMany(watchDocuments, {
            ordered: false,
            session,
          });

          migratedCount += result.insertedCount;
        } catch (error: unknown) {
          // Log errors but continue migration (some channels might already exist)
          if (error?.writeErrors) {
            const duplicateErrors = error.writeErrors.filter(
              (err: any) => err.code === 11000,
            );
            const otherErrors = error.writeErrors.filter(
              (err: any) => err.code !== 11000,
            );

            if (duplicateErrors.length > 0) {
              console.log(
                `Skipped ${duplicateErrors.length} duplicate watch channels for user ${syncDoc.user}`,
              );
            }

            if (otherErrors.length > 0) {
              console.error(
                `Errors inserting watch data for user ${syncDoc.user}:`,
                otherErrors,
              );
            }

            // Count successful inserts
            const successCount =
              watchDocuments.length - error.writeErrors.length;
            migratedCount += successCount;
          } else {
            console.error(
              `Unexpected error migrating watch data for user ${syncDoc.user}:`,
              error,
            );
          }
        }
      }
    }

    console.log(
      `Migrated ${migratedCount} events watch channels to watch collection`,
    );
  }

  async down(): Promise<void> {
    // This is a non-destructive migration, we don't remove the data from watch collection
    // because it might have been updated or new watches might have been added
    console.log("Non-destructive migration: watch collection data left intact");
  }
}
