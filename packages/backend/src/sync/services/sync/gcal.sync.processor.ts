import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  Event_Core,
  Schema_Event,
  Schema_Event_Core,
  Schema_Event_Recur_Base,
  WithCompassId,
} from "@core/types/event.types";
import {
  WithGcalId,
  WithRecurrenceRule,
  gSchema$Event,
  gSchema$EventBase,
} from "@core/types/gcal";
import { convertRruleWithUntilToDate } from "@core/util/date/date.util";
import { isBase } from "@core/util/event/event.util";
import {
  EventError,
  GenericError,
} from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { findCompassEventBy } from "@backend/event/queries/event.queries";
import { EventRepository } from "@backend/event/services/recur/repo/event.repo";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
import { Change_Gcal, Operation_Sync } from "../../sync.types";
import { createSyncImport } from "../import/sync.import";

const logger = Logger("app.sync.processor");
export class GcalSyncProcessor {
  private eventRepo: EventRepository;
  constructor(private recurringEventRepo: RecurringEventRepository) {
    this.eventRepo = new EventRepository(recurringEventRepo.userId);
  }

  async processEvents(events: gSchema$Event[]): Promise<Change_Gcal[]> {
    const summary: Change_Gcal[] = [];
    console.log(`Processing ${events.length} event(s)...`);
    for (const gEvent of events) {
      if (!gEvent.id) {
        throw error(
          EventError.MissingGevents,
          "Event not processed due to missing id",
        );
      }
      const parser = new GcalParser(gEvent);
      const category = parser.category;
      let operation: Operation_Sync = null;

      switch (category) {
        case "STANDALONE":
          operation = await this.handleStandaloneChange(
            gEvent as WithGcalId<gSchema$Event>,
          );
          break;
        case "RECURRENCE_INSTANCE":
          operation = await this.handleInstanceChange(
            gEvent as WithGcalId<gSchema$Event>,
            parser,
          );
          break;
        case "RECURRENCE_BASE":
          operation = await this.handleSeriesChange(
            gEvent as gSchema$EventBase,
            parser,
          );
          break;
      }

      const change = parser.summarize();
      summary.push({ ...change, operation });
    }
    return summary;
  }

  private async getCompassEvent(gEventId: string) {
    const { event: compassEvent } = await findCompassEventBy(
      "gEventId",
      gEventId,
    );

    return compassEvent;
  }

  private async handleInstanceChange(
    gEvent: WithGcalId<gSchema$Event>,
    parser: GcalParser,
  ): Promise<Operation_Sync> {
    const status = parser.status;

    if (status === "CANCELLED") {
      logger.info(`Cancelling INSTANCE: ${gEvent.id} (Gcal)`);
      await this.recurringEventRepo.cancelInstance(gEvent.id, {
        idKey: "gEventId",
      });
      return "DELETED";
    }
    logger.info(`Updating INSTANCE: ${gEvent.summary}`);
    const updatedInstance = MapEvent.toCompass(this.recurringEventRepo.userId, [
      gEvent,
    ])[0] as Event_Core;
    await this.recurringEventRepo.updateInstance(updatedInstance);
    return "UPSERTED";
  }

  private async handleSeriesChange(
    gEvent: gSchema$EventBase,
    parser: GcalParser,
  ): Promise<Operation_Sync> {
    const status = parser.status;

    const compassEvent = await this.getCompassEvent(gEvent.id);
    if (!compassEvent) {
      const syncImport = await createSyncImport(this.recurringEventRepo.userId);
      await syncImport.importSeries(
        this.recurringEventRepo.userId,
        "primary",
        gEvent,
      );
      return "UPSERTED";
    }
    if (status === "CANCELLED") {
      logger.info(
        `Cancelling SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );
      await this.recurringEventRepo.cancelSeries(compassEvent._id.toString());
      return "DELETED";
    }

    if (
      this.isSeriesSplit(gEvent, compassEvent as WithCompassId<Schema_Event>)
    ) {
      logger.info(
        `Splitting SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );

      await this.updateBaseEvent(
        compassEvent as WithCompassId<Schema_Event>,
        gEvent,
      );
      await this.deleteInstancesAfterNewBase(
        compassEvent._id.toString(),
        gEvent,
      );

      return "UPSERTED";
    }

    const isSeriesUpdate = parser.isRecurrenceBase();
    if (isSeriesUpdate) {
      logger.info(
        `Updating SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );
      await this.updateSeries(
        compassEvent as WithCompassId<Schema_Event>,
        gEvent,
      );
      return "UPSERTED";
    }

    throw error(GenericError.DeveloperError, "Series change not handled");
  }
  private async handleStandaloneChange(
    gEvent: WithGcalId<gSchema$Event>,
  ): Promise<Operation_Sync> {
    const shouldDelete = gEvent.status === "cancelled";
    if (shouldDelete) {
      logger.info(`DELETING STANDALONE: ${gEvent.id} (Gcal)`);
      await this.eventRepo.deleteById("gEventId", gEvent.id);
      return "DELETED";
    }
    const compassEvent = MapEvent.toCompass(this.recurringEventRepo.userId, [
      gEvent,
    ])[0] as Event_Core;
    await this.eventRepo.updateById("gEventId", compassEvent);
    return "UPSERTED";
  }
  private isSeriesSplit(
    gEvent: WithGcalId<gSchema$Event>,
    cEvent: WithCompassId<Schema_Event>,
  ): boolean {
    const isNotBase =
      !gEvent.recurrence ||
      !cEvent ||
      !isBase(cEvent) ||
      !cEvent.recurrence?.rule;

    if (isNotBase) {
      return false;
    }

    const currentUntil = this.extractUntilValue(
      cEvent.recurrence?.rule?.[0] as string,
    );
    const newUntil = this.extractUntilValue(gEvent?.recurrence?.[0] as string);

    if (!newUntil) {
      return false;
    }

    // Split detected if:
    // 1. New UNTIL date is earlier than current
    // 2. No UNTIL date existed before
    const isSplit = currentUntil ? newUntil < currentUntil : true;
    return isSplit;
  }

  private extractUntilValue(recurrenceRule: string): string | null {
    const untilMatch = recurrenceRule.match(/UNTIL=([^;]+)/);
    if (!untilMatch) return null;

    // Handle both date-only and datetime formats
    const untilStr = untilMatch[1] as string;
    return untilStr;
  }

  private async deleteInstancesAfterNewBase(
    cBaseId: string,
    gEvent: WithGcalId<WithRecurrenceRule<gSchema$Event>>,
  ) {
    const afterDateIso = convertRruleWithUntilToDate(
      gEvent.recurrence[0] as string,
    );
    if (!afterDateIso) {
      throw error(
        EventError.InvalidRecurrence,
        "Did not delete instances during split, because no UNTIL date found",
      );
    }
    // Delete all instances after the UNTIL date
    const result = await this.recurringEventRepo.deleteInstancesAfter(
      cBaseId,
      afterDateIso,
    );
    return result;
  }

  private async updateBaseEvent(
    compassEvent: WithCompassId<Schema_Event>,
    gEvent: WithGcalId<gSchema$Event>,
  ) {
    const _newCompassBase = MapEvent.toCompass(compassEvent.user as string, [
      gEvent,
    ]) as unknown as Schema_Event_Core[];
    const newCompassBase = _newCompassBase[0] as Schema_Event_Core;
    await this.eventRepo.updateEvent(compassEvent._id, newCompassBase);
  }

  private async updateSeries(
    origCompassEvent: WithCompassId<Schema_Event>,
    gEvent: WithGcalId<gSchema$Event>,
  ) {
    const updatedCompassBase = MapEvent.toCompass(
      origCompassEvent.user as string,
      [gEvent],
    )[0] as Schema_Event_Recur_Base;
    await this.recurringEventRepo.updateSeries(updatedCompassBase, "gEventId");
  }
}
