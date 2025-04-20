import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  Event_Core,
  Schema_Event,
  Schema_Event_Core,
  WithCompassId,
} from "@core/types/event.types";
import {
  WithGcalId,
  WithRecurrenceRule,
  gSchema$Event,
  gSchema$EventBase,
} from "@core/types/gcal";
import { convertRfc5545ToIso } from "@core/util/date.utils";
import {
  EventError,
  GenericError,
} from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  findCompassEventBy,
  updateEvent,
} from "@backend/event/queries/event.queries";
import { RecurringEventRepository } from "@backend/event/services/recur/repo/recur.event.repo";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
import { isBase } from "@backend/event/util/event.util";
import { Change_Gcal, Operation_Sync } from "../../sync.types";
import { createSyncImport } from "../import/sync.import";

const logger = Logger("app.sync.processor");
export class GcalSyncProcessor {
  constructor(private repo: RecurringEventRepository) {}

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
          console.log("TODO: HANDLE STANDALONE CHANGE");
          operation = "UPSERTED";
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
      await this.repo.cancelInstance(gEvent.id, { idKey: "gEventId" });
      return "DELETED";
    }
    logger.info(`Updating INSTANCE: ${gEvent.summary}`);
    const updatedInstance = MapEvent.toCompass(this.repo.userId, [
      gEvent,
    ])[0] as Event_Core;
    await this.repo.updateInstance(updatedInstance);
    return "UPSERTED";
  }

  private async handleSeriesChange(
    gEvent: gSchema$EventBase,
    parser: GcalParser,
  ): Promise<Operation_Sync> {
    const status = parser.status;

    const compassEvent = await this.getCompassEvent(gEvent.id);
    if (!compassEvent) {
      const syncImport = await createSyncImport(this.repo.userId);
      await syncImport.importSeries(this.repo.userId, "primary", gEvent);
      return "UPSERTED";
    }
    if (status === "CANCELLED") {
      logger.info(
        `Cancelling SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );
      await this.repo.cancelSeries(compassEvent._id.toString());
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
    if (this.isSeriesUpdate()) {
      logger.info(
        `TODO Updating SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );
      return "UPSERTED";
    }

    throw error(GenericError.DeveloperError, "Series change not handled");
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
      console.log("gEvent.recurrence", gEvent.recurrence);
      console.log("cEvent", cEvent);
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

  private isSeriesUpdate(): boolean {
    return true;
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
    const untilValue = convertRfc5545ToIso(gEvent.recurrence[0] as string);
    if (!untilValue) {
      throw error(
        EventError.InvalidRecurrence,
        "Did not delete instances during split, because no UNTIL date found",
      );
    }
    // Delete all instances after the UNTIL date
    const result = await this.repo.deleteInstancesAfter(cBaseId, untilValue);
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
    await updateEvent(
      compassEvent.user as string,
      compassEvent._id,
      newCompassBase,
    );
  }
}
