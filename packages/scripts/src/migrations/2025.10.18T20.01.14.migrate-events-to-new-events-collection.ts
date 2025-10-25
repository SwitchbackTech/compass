import { ObjectId } from "bson";
import type { MigrationParams, RunnableMigration } from "umzug";
import { z } from "zod/v4";
import { MigrationContext } from "@scripts/common/cli.types";
import { Origin, Priorities } from "@core/constants/core.constants";
import {
  EventMetadataSchema,
  EventSchema,
  Schema_Event,
} from "@core/types/event.types";
import { zObjectId } from "@core/types/type.utils";
import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { MONGO_BATCH_SIZE } from "@backend/common/constants/backend.constants";
import mongoService from "@backend/common/services/mongo.service";

type Old_Schema_Event = z.infer<typeof Migration.OldEventSchema>;

export default class Migration implements RunnableMigration<MigrationContext> {
  readonly name: string =
    "2025.10.18T20.01.14.migrate-events-to-new-events-collection";
  readonly path: string =
    "2025.10.18T20.01.14.migrate-events-to-new-events-collection.ts";
  static readonly OldEventSchema = z.object({
    _id: zObjectId.optional(),
    title: z.string().optional(),
    description: z.string().nullable().optional(),
    isSomeday: z.boolean().optional(),
    startDate: z.string().nonempty().min(10),
    endDate: z.string().nonempty().min(10),
    order: z.number().optional(),
    origin: z.enum(Origin),
    priority: z.enum(Priorities),
    updatedAt: z.union([z.date(), z.string().nonempty().min(10)]).optional(),
    isAllDay: z.boolean().optional(),
    gEventId: z.string().optional(),
    gRecurringEventId: z.string().optional(),
    user: z.string(),
    recurrence: z
      .object({
        rule: z.array(z.string()).nonempty().optional(),
        eventId: z.string().optional(),
      })
      .optional(),
  });

  private static isAllDay(
    event: Pick<Old_Schema_Event, "startDate" | "endDate">,
  ) {
    return (
      event !== undefined &&
      // 'YYYY-MM-DD' has 10 chars
      event.startDate?.length === 10 &&
      event.endDate?.length === 10
    );
  }

  private static getCompassEventDateFormat(date: string): string {
    const allday = Migration.isAllDay({ startDate: date, endDate: date });
    const { YEAR_MONTH_DAY_FORMAT, RFC3339_OFFSET } = dayjs.DateFormat;
    const format = allday ? YEAR_MONTH_DAY_FORMAT : RFC3339_OFFSET;

    return format;
  }

  private static parseCompassEventDate = (date: string): Dayjs => {
    if (!date) throw new Error("`date` or `dateTime` must be defined");

    const format = Migration.getCompassEventDateFormat(date);
    const timezone = dayjs.tz.guess();

    return dayjs(date, format).tz(timezone);
  };

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
      const start = Migration.parseCompassEventDate(_start);
      const end = isAllDay
        ? start.endOf("day")
        : Migration.parseCompassEventDate(_end);
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
        const metadata = EventMetadataSchema.parse(
          gRecurringEventId
            ? { id: gEventId, recurringEventId: gRecurringEventId }
            : { id: gEventId },
        );

        Object.assign(eventDetails, { metadata });
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
