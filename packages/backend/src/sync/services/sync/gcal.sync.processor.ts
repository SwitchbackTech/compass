import { Schema_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { findCompassEventBy } from "@backend/event/queries/event.queries";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
import { isBase } from "@backend/event/services/recur/util/recur.util";
import { Change_Gcal, Operation_Sync } from "../../sync.types";

export class GcalSyncProcessor {
  constructor(private repo: RecurringEventRepository) {}

  async processEvents(events: gSchema$Event[]): Promise<Change_Gcal[]> {
    const summary: Change_Gcal[] = [];
    console.log(`Processing ${events.length} events...`);
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
        const { isBaseCancellation, compassEvent } =
          await this.isBaseCancellation(event);

        if (isBaseCancellation) {
          console.log(
            `Cancelling series: ${compassEvent._id}(Compass) and ${event.id} (Gcal)`,
          );
          await this.repo.cancelSeries(compassEvent._id.toString());
          operation = "DELETED";
        } else {
          console.log(
            `Cancelling instance: ${compassEvent._id}(Compass) and ${event.id} (Gcal)`,
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
  private async isBaseCancellation(event: gSchema$Event) {
    if (!event.id) {
      throw error(
        EventError.MissingGevents,
        "Event not processed due to missing id",
      );
    }
    // find the base event by looking for the
    // compass event with the matching gEventId
    const { eventExists, event: compassEvent } = await findCompassEventBy(
      "gEventId",
      event.id,
    );
    if (!eventExists) {
      throw error(
        EventError.MissingGevents,
        "Did not cancel series becauase base event not found",
      );
    }
    return {
      isBaseCancellation: isBase(compassEvent as Schema_Event),
      compassEvent,
    };
  }
}
