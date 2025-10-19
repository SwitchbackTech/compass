import { ObjectId } from "bson";
import type { MigrationParams, RunnableMigration } from "umzug";
import { z } from "zod/v4";
import { MigrationContext } from "@scripts/common/cli.types";
import { Origin, Priorities } from "@core/constants/core.constants";
import { CalendarProvider } from "@core/types/event.types";
import {
  EventSchema,
  GoogleEventMetadataSchema,
  Schema_Event,
} from "@core/types/event_new.types";
import { zObjectId } from "@core/types/type.utils";
import { parseCompassEventDate } from "@core/util/event/event.util";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string =
    "2025.10.18T20.01.14.migrate-events-to-new-events-collection";
  readonly path: string =
    "2025.10.18T20.01.14.migrate-events-to-new-events-collection.ts";
  static readonly OldEventSchema = z.object({
    _id: zObjectId.optional(),
    description: z.string().nullable().optional(),
    isAllDay: z.boolean().optional(),
    isSomeday: z.boolean().optional(),
    gEventId: z.string().optional(),
    gRecurringEventId: z.string().optional(),
    origin: z.enum(Origin),
    priority: z.enum(Priorities),
    recurrence: z
      .object({
        rule: z.array(z.string()).nonempty().optional(),
        eventId: z.string().optional(),
      })
      .optional(),
    startDate: z.string().nonempty().min(10),
    endDate: z.string().nonempty().min(10),
    title: z.string().optional(),
    updatedAt: z.union([z.date(), z.string().nonempty().min(10)]).optional(),
    user: z.string(),
  });

  async up(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const collectionName = `${mongoService.event.collectionName}_new`;
    const collection = mongoService.db.collection<Schema_Event>(collectionName);

    await collection.deleteMany();

    const cursor = mongoService.event.find({}, { batchSize: MONGO_BATCH_SIZE });
    const bulkInsert = collection.initializeUnorderedBulkOp();
    const calendars = new Map<string, ObjectId>();
    const rrules = new Map<string, string[]>();

    for await (const _event of cursor) {
      const parsed = Migration.OldEventSchema.safeParse(_event);
      const { success, data, error } = parsed;

      if (!success) {
        logger.error(
          `Skipping event with id ${_event._id} due to validation errors`,
          error,
        );

        continue;
      }

      const { gEventId, gRecurringEventId, user: _user, ..._details } = data;
      const { startDate: _start, endDate: _end, ...details } = _details;
      const { isAllDay, recurrence, ...eventDetails } = details;
      const user = new ObjectId(_user);
      const start = parseCompassEventDate(_start);
      const end = isAllDay ? start.endOf("day") : parseCompassEventDate(_end);
      const startDate = start.toDate();
      const endDate = end.toDate();

      const calendar =
        calendars.get(_user) ??
        (await mongoService.calendar
          .findOne({ user })
          .then((c) =>
            ObjectId.isValid(c?._id ?? "")
              ? calendars.set(_user, c!._id).get(_user)
              : undefined,
          ));

      if (calendar === undefined) {
        logger.error(
          `Skipping event(${_event._id}). No calendar found for user ${user}`,
        );

        continue;
      }

      if (gEventId) {
        const provider = CalendarProvider.GOOGLE;

        const metadata = GoogleEventMetadataSchema.parse(
          gRecurringEventId
            ? { provider, gEventId, gRecurringEventId }
            : { provider, gEventId },
        );

        Object.assign(eventDetails, { metadata: [metadata] });
      } else {
        Object.assign(eventDetails, {
          metadata: [{ provider: CalendarProvider.COMPASS }],
        });
      }

      if (recurrence) {
        const { eventId } = recurrence;
        if (eventId) {
          const rule =
            rrules.get(eventId) ??
            (await mongoService.event
              .findOne({ _id: new ObjectId(eventId) })
              .then((e) => {
                if (!Array.isArray(e?.recurrence?.rule)) return undefined;

                return rrules.set(eventId, e?.recurrence?.rule).get(eventId);
              }));

          if (!Array.isArray(rule)) {
            logger.warn(
              `Skipping recurrence for event(${_event._id}). No recurrence rule found for eventId ${eventId}`,
            );

            continue;
          }

          Object.assign(eventDetails, {
            recurrence: { rule, eventId: new ObjectId(eventId) },
          });
        } else {
          Object.assign(eventDetails, { recurrence });
        }
      }

      const event = EventSchema.parse({
        ...eventDetails,
        startDate,
        endDate,
        calendar,
        updatedAt: new Date(),
      });

      bulkInsert.insert(event);
    }

    if (bulkInsert.batches.length > 0) {
      const result = await bulkInsert.execute();

      logger.info(
        `Migrated ${result.insertedCount} events into ${collectionName}`,
      );
    } else {
      logger.info(`No events to migrate into ${collectionName}`);
    }
  }

  async down(params: MigrationParams<MigrationContext>): Promise<void> {
    const { logger } = params.context;
    const collectionName = `${mongoService.event.collectionName}_new`;
    const collection = mongoService.db.collection<Schema_Event>(collectionName);

    await collection.deleteMany();

    logger.info(`Deleted all events from the new event's collection`);
  }
}
