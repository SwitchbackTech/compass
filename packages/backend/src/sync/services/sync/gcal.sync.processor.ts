import { Logger } from "@core/logger/winston.logger";
import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { findCompassEventBy } from "@backend/event/queries/event.queries";
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
    for (const event of events) {
      const parser = new GcalParser(event);
      const category = parser.category;
      const status = parser.status;
      const change = parser.summarize();
      let operation: Operation_Sync = null;

      if (!event.id) {
        throw error(
          EventError.MissingGevents,
          "Event not processed due to missing id",
        );
      }

      // --- Handle cancellation ---
      if (status === "CANCELLED") {
        const compassEvent = await this.getCompassEvent(event.id);
        if (!compassEvent) {
          logger.warn(
            "Not processing this event, because it was not found in DB:",
            event.summary,
          );
          continue;
        }

        if (isBase(compassEvent as Schema_Event)) {
          console.log(
            `Cancelling series: ${compassEvent._id} (Compass) | ${event.id} (Gcal)`,
          );
          await this.repo.cancelSeries(compassEvent._id.toString());
          operation = "DELETED";
        } else {
          console.log(
            `Cancelling instance: ${compassEvent._id} (Compass) | ${event.id} (Gcal)`,
          );
          await this.repo.cancelInstance(event.id, { idKey: "gEventId" });
          operation = "DELETED";
        }
      }

      // --- Handle upsert for active event ---
      else {
        /*
        - init a mapper
        - map to compass schema (base or instance)
        - upsert (see ref file)
        */
        if (category === "RECURRENCE_BASE") {
          operation = "UPSERTED";
        } else {
          // Upsert Instance
          operation = "UPSERTED";
        }
      }
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
}
