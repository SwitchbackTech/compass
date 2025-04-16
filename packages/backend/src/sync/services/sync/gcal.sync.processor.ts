import { Logger } from "@core/logger/winston.logger";
import { MapEvent } from "@core/mappers/map.event";
import {
  Schema_Event,
  Schema_Event_Core,
  WithCompassId,
} from "@core/types/event.types";
import {
  WithGcalId,
  WithRecurrenceRule,
  gSchema$Event,
} from "@core/types/gcal";
import { convertRfc5545ToIso } from "@core/util/date.utils";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import {
  findCompassEventBy,
  updateEvent,
} from "@backend/event/queries/event.queries";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
import { isBase } from "@backend/event/services/recur/util/recur.util";
import { Change_Gcal, Operation_Sync } from "../../sync.types";

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
            gEvent as WithGcalId<WithRecurrenceRule<gSchema$Event>>,
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
    if (!compassEvent) {
      throw error(
        EventError.MissingCompassEvent,
        "Not processing this event, because it was not found in DB:",
      );
    }
    return compassEvent as WithCompassId<Schema_Event>;
  }

  private async handleInstanceChange(
    gEvent: WithGcalId<gSchema$Event>,
    parser: GcalParser,
  ): Promise<Operation_Sync> {
    console.log("Instance change", gEvent.summary);
    const status = parser.status;

    if (status === "CANCELLED") {
      logger.info(`Cancelling INSTANCE: | ${gEvent.id} (Gcal)`);
      await this.repo.cancelInstance(gEvent.id, { idKey: "gEventId" });
      return "DELETED";
    }
    // Update instance - regular instance change
    console.log("TODO: UPSERT");
    return "UPSERTED";
  }

  private async handleSeriesChange(
    gEvent: WithGcalId<WithRecurrenceRule<gSchema$Event>>,
    parser: GcalParser,
  ): Promise<Operation_Sync> {
    const status = parser.status;

    const compassEvent = await this.getCompassEvent(gEvent.id);
    if (status === "CANCELLED") {
      logger.info(
        `Cancelling SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );
      await this.repo.cancelSeries(compassEvent._id.toString());
      return "DELETED";
    }

    if (this.isSeriesSplit(gEvent, compassEvent)) {
      logger.info(
        `Splitting SERIES: ${compassEvent?._id} (Compass) | ${gEvent.id} (Gcal)`,
      );

      await this.updateBaseEvent(compassEvent, gEvent);
      await this.deleteInstancesAfterNewBase(
        compassEvent._id.toString(),
        gEvent,
      );

      return "UPSERTED";
    } else {
      // Create or update series
      return "UPSERTED";
    }
  }
  private isSeriesSplit(
    gEvent: WithGcalId<gSchema$Event>,
    cEvent: WithCompassId<Schema_Event>,
  ): boolean {
    if (
      !gEvent.recurrence ||
      !cEvent ||
      !isBase(cEvent) ||
      !cEvent.recurrence?.rule
    ) {
      return false;
    }

    const newUntil = this.extractUntilValue(gEvent.recurrence[0] as string);
    const currentUntil = this.extractUntilValue(
      cEvent.recurrence.rule[0] as string,
    );

    // Split detected if:
    // 1. New UNTIL date is earlier than current
    // 2. No UNTIL date existed before
    return !currentUntil || !!(newUntil && newUntil < currentUntil);
  }

  private extractUntilValue(recurrenceRule: string): string | null {
    const untilMatch = recurrenceRule.match(/UNTIL=([^;]+)/);
    if (!untilMatch) return null;

    // Handle both date-only and datetime formats
    const untilStr = untilMatch[1] as string;
    return untilStr;
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
}
