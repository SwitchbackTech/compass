import { type MigrationContext } from "@scripts/common/cli.types";
import {
  type EventMigrationVerifyDeps,
  verifyEventMigration,
} from "@scripts/common/event-migration.verify";
import {
  type LegacyEventTransformResult,
  transformLegacyEvent,
} from "@scripts/common/legacy-event.transform";
import { assignMissingSomedaySortOrders } from "@scripts/common/legacy-event.transform.sort";
import { zodToMongoSchema } from "@scripts/common/zod-to-mongo-schema";
import {
  type AnyBulkWriteOperation,
  type Document,
  MongoBulkWriteError,
  type ObjectId,
} from "mongodb";
import { type MigrationParams, type RunnableMigration } from "umzug";
import { type CalendarRecord } from "@backend/calendar/calendar.record";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";
import {
  type EventRecord,
  EventRecordSchema,
} from "@backend/event/event.record";

type PendingOp = {
  legacyId: string;
  op: AnyBulkWriteOperation<EventRecord>;
};

type Failure = { legacyId: string | null; reason: string };

// Legacy 2025-era prototype indexes; dropped defensively before the final
// index set is created.
const legacyIndexNames = (collectionName: string): string[] => [
  `${collectionName}_calendar_index`,
  `${collectionName}_calendar_startDate_index`,
  `${collectionName}_calendar_endDate_index`,
  `${collectionName}_calendar_startDate_endDate_index`,
  `${collectionName}_calendar_isSomeday_index`,
  `${collectionName}_calendar_metadata__gRecurringEventId_index`,
  `${collectionName}_calendar_metadata__gEventId_unique`,
];

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string = "2026.07.10T21.30.00.event-record-backfill";
  readonly path: string = "2026.07.10T21.30.00.event-record-backfill.ts";

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const collectionName = `${mongoService.event.collectionName}_new`;
    const destination = mongoService.db.collection<EventRecord>(collectionName);
    // This migration runs strictly after the calendar-record-migration, so
    // by this point the `calendar` collection is always in the final
    // CalendarRecord shape -- typed separately from mongoService.calendar
    // (which is still typed to the legacy Schema_Calendar shape).
    const calendars = mongoService.db.collection<CalendarRecord>(
      mongoService.calendar.collectionName,
    );

    await this.#applyValidatorAndIndexes(collectionName);

    // The destination is derived prototype data that has never been
    // activated in production; the legacy `event` collection remains the
    // untouched source of truth (the plan's non-negotiables protect only
    // legacy). Clearing it guarantees a rerun converges with zero stale rows
    // instead of accumulating duplicates alongside upserts.
    await destination.deleteMany({});

    const failures: Failure[] = [];
    let attempted = 0;
    let inserted = 0;
    let sortOrdersAssigned = 0;
    const timeZoneTally: Record<"calendar" | "utcFallback" | "none", number> = {
      calendar: 0,
      utcFallback: 0,
      none: 0,
    };

    const localCalendarIdByUser = new Map<string, ObjectId>();
    const primaryGoogleCalendarByUser = new Map<
      string,
      { id: ObjectId; timeZone: string | null } | null
    >();
    const legacyBaseIdsByUser = new Map<string, Set<string>>();

    const flush = async (pending: PendingOp[]): Promise<void> => {
      if (pending.length === 0) return;
      try {
        const result = await destination.bulkWrite(
          pending.map((p) => p.op),
          { ordered: false },
        );
        inserted +=
          result.upsertedCount + result.modifiedCount + result.insertedCount;
      } catch (error) {
        if (error instanceof MongoBulkWriteError) {
          const writeErrors = Array.isArray(error.writeErrors)
            ? error.writeErrors
            : error.writeErrors
              ? [error.writeErrors]
              : [];
          const failedIndexes = new Set(writeErrors.map((we) => we.index));
          for (const we of writeErrors) {
            const legacyId = pending[we.index]?.legacyId ?? "unknown";
            failures.push({
              legacyId,
              reason: `duplicateOrWriteError:${we.code}`,
            });
          }
          inserted += pending.length - failedIndexes.size;
        } else {
          throw error;
        }
      } finally {
        pending.length = 0;
      }
    };

    const userCursor = mongoService.user.find(
      {},
      { batchSize: MONGO_BATCH_SIZE },
    );

    for await (const user of userCursor) {
      const userIdHex = user._id.toHexString();

      const localCalendar = await calendars.findOne({
        userId: user._id,
        "source.provider": "local",
      });
      if (!localCalendar) {
        throw new Error(
          `Event backfill aborted: user ${userIdHex} has no local calendar. ` +
            `Run the calendar-record-migration first.`,
        );
      }
      localCalendarIdByUser.set(userIdHex, localCalendar._id);

      const primaryGoogle = await calendars.findOne({
        userId: user._id,
        isPrimary: true,
        "source.provider": "google",
      });
      const primaryGoogleCalendar = primaryGoogle
        ? { id: primaryGoogle._id, timeZone: primaryGoogle.timeZone }
        : null;
      primaryGoogleCalendarByUser.set(userIdHex, primaryGoogleCalendar);

      // One query per user: legacy series bases (rows with a recurrence
      // rule) referenced by occurrences via their legacy _id.
      const baseIds = new Set<string>();
      const baseCursor = mongoService.event.find(
        { user: userIdHex, "recurrence.rule": { $exists: true } } as Document,
        { projection: { _id: 1 }, batchSize: MONGO_BATCH_SIZE },
      );
      for await (const base of baseCursor) {
        baseIds.add((base._id as unknown as ObjectId).toHexString());
      }
      legacyBaseIdsByUser.set(userIdHex, baseIds);

      const context = {
        localCalendarId: localCalendar._id,
        primaryGoogleCalendar,
        legacyBaseEventExists: (legacyBaseId: string) =>
          baseIds.has(legacyBaseId),
      };

      const pending: PendingOp[] = [];
      const somedayResults: Extract<
        LegacyEventTransformResult,
        { ok: true }
      >[] = [];

      const eventCursor = mongoService.event.find(
        { user: userIdHex } as Document,
        { batchSize: MONGO_BATCH_SIZE },
      );

      for await (const legacyEvent of eventCursor) {
        attempted += 1;
        const result = transformLegacyEvent(legacyEvent, context);

        if (!result.ok) {
          failures.push({ legacyId: result.legacyId, reason: result.reason });
          continue;
        }

        timeZoneTally[result.timeZoneSource ?? "none"] += 1;

        if (result.record.schedule.kind === "someday") {
          somedayResults.push(result);
          continue;
        }

        pending.push({
          legacyId: result.record._id.toHexString(),
          op: {
            replaceOne: {
              filter: { _id: result.record._id },
              replacement: result.record,
              upsert: true,
            },
          },
        });

        if (pending.length >= MONGO_BATCH_SIZE) await flush(pending);
      }

      await flush(pending);

      if (somedayResults.length > 0) {
        // Someday lists are product-capped tiny per user, so holding them
        // in memory for the whole scan (required for deterministic ordering
        // within a bucket) stays bounded.
        assignMissingSomedaySortOrders(somedayResults);
        sortOrdersAssigned += somedayResults.filter(
          (r) => r.sortOrderAssigned,
        ).length;

        const somedayPending: PendingOp[] = somedayResults.map((r) => ({
          legacyId: r.record._id.toHexString(),
          op: {
            replaceOne: {
              filter: { _id: r.record._id },
              replacement: r.record,
              upsert: true,
            },
          },
        }));

        while (somedayPending.length > 0) {
          await flush(somedayPending.splice(0, MONGO_BATCH_SIZE));
        }
      }
    }

    // Audit legacy allDayOrder usage (retired field, no production reader)
    // and record its count per the plan's audit requirement.
    const allDayOrderCount = await mongoService.event.countDocuments({
      allDayOrder: { $exists: true },
    } as Document);

    logger.info(
      `Event backfill scan complete: attempted=${attempted} inserted=${inserted} ` +
        `failed=${failures.length} sortOrdersAssigned=${sortOrdersAssigned} ` +
        `timeZoneSource=${JSON.stringify(timeZoneTally)} legacyAllDayOrderCount=${allDayOrderCount}`,
    );

    if (failures.length > 0) {
      throw new Error(
        `Event backfill aborted: ${failures.length} failure(s): ${JSON.stringify(
          failures,
        )}`,
      );
    }

    const verifyDeps: EventMigrationVerifyDeps = {
      legacyCollection: mongoService.db.collection<Document>(
        mongoService.event.collectionName,
      ),
      destinationCollection: destination,
      calendarCollection: calendars,
      localCalendarIdByUser,
      primaryGoogleCalendarByUser,
      legacyBaseIdsByUser,
      legacyUserOf: (legacyDoc) =>
        typeof (legacyDoc as Document)["user"] === "string"
          ? ((legacyDoc as Document)["user"] as string)
          : null,
    };

    const verification = await verifyEventMigration(verifyDeps);
    if (!verification.ok) {
      throw new Error(
        `Event backfill verification failed: ${JSON.stringify(
          verification.mismatches,
        )}`,
      );
    }

    logger.info(
      `Event backfill verification passed: ${JSON.stringify(verification.summary)}`,
    );
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;

    logger.info(
      "Down migration is a non-destructive no-op for the event record " +
        "backfill; rollback restores from backup per the runbook",
    );

    return Promise.resolve();
  }

  async #applyValidatorAndIndexes(collectionName: string): Promise<void> {
    const destination = mongoService.db.collection<EventRecord>(collectionName);
    const $jsonSchema = zodToMongoSchema(EventRecordSchema);

    const exists = await mongoService.db
      .listCollections({ name: collectionName })
      .hasNext();

    if (exists) {
      await mongoService.db.command({
        collMod: collectionName,
        validator: { $jsonSchema },
        validationLevel: "strict",
      });
    } else {
      await mongoService.db.createCollection(collectionName, {
        validator: { $jsonSchema },
        validationLevel: "strict",
      });
    }

    for (const name of legacyIndexNames(collectionName)) {
      try {
        await destination.dropIndex(name);
      } catch {
        // Index absent (already dropped by a prior run or never created) --
        // dropping is defensive, not required.
      }
    }

    await destination.createIndex({
      calendarId: 1,
      "schedule.kind": 1,
      "schedule.start": 1,
    });
    await destination.createIndex({
      calendarId: 1,
      "schedule.kind": 1,
      "schedule.end": 1,
    });
    await destination.createIndex(
      {
        calendarId: 1,
        "schedule.period": 1,
        "schedule.anchorDate": 1,
        "schedule.sortOrder": 1,
      },
      {
        name: "event_calendar_someday_order",
        partialFilterExpression: { "schedule.kind": "someday" },
      },
    );
    await destination.createIndex(
      { "recurrence.seriesId": 1 },
      {
        name: "event_recurrence_seriesId",
        partialFilterExpression: { "recurrence.kind": "occurrence" },
      },
    );
    await destination.createIndex(
      {
        calendarId: 1,
        "externalReference.provider": 1,
        "externalReference.eventId": 1,
      },
      {
        name: "event_calendar_externalReference_unique",
        unique: true,
        partialFilterExpression: {
          "externalReference.eventId": { $exists: true },
        },
      },
    );
  }
}
