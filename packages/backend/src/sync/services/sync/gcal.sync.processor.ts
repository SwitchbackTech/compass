import { Logger } from "@core/logger/winston.logger";
import { Event_Core } from "@core/types/event.types";
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
    for (const gEvent of events) {
      const parser = new GcalParser(gEvent);
      const category = parser.category;
      const status = parser.status;
      const change = parser.summarize();
      let operation: Operation_Sync = null;

      if (!gEvent.id) {
        throw error(
          EventError.MissingGevents,
          "Event not processed due to missing id",
        );
      }

      // --- Handle cancellation ---
      if (status === "CANCELLED") {
        const compassEvent = await this.getCompassEvent(gEvent.id);
        if (!compassEvent) {
          logger.warn(
            "Not processing this event, because it was not found in DB:",
            gEvent.summary,
          );
          continue;
        }

        if (isBase(compassEvent as Event_Core)) {
          console.log(
            `Cancelling SERIES: ${compassEvent._id} (Compass) | ${gEvent.id} (Gcal)`,
          );
          await this.repo.cancelSeries(compassEvent._id.toString());
          operation = "DELETED";
        } else {
          console.log(
            `Cancelling INSTANCE: ${compassEvent._id} (Compass) | ${gEvent.id} (Gcal)`,
          );
          await this.repo.cancelInstance(gEvent.id, { idKey: "gEventId" });
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
