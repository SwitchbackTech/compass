import { gSchema$Event } from "@core/types/gcal";
import { EventError } from "@backend/common/constants/error.constants";
import { error } from "@backend/common/errors/handlers/error.handler";
import { findCompassEventBy } from "@backend/event/queries/event.queries";
import { RecurringEventRepository } from "@backend/event/queries/event.recur.queries";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
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
        if (category === "RECURRENCE_BASE") {
          // find the base event by looking for the
          // compass event with the matching gEventId
          const result = await findCompassEventBy("gEventId", event.id);
          if (!result.eventExists) {
            throw error(
              EventError.MissingGevents,
              "Did not cancel series becauase base event not found",
            );
          }
          console.log(
            `Matched these ids: ${result.event._id}(Compass) and ${event.id} (Gcal)`,
          );
          await this.repo.cancelSeries(result.event._id.toString());
          operation = "CANCELLED";
        } else {
          await this.repo.cancelInstance(event.id, { idKey: "gEventId" });
          operation = "CANCELLED";
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
}
