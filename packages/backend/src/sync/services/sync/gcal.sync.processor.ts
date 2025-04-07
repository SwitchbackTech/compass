import { gCalendar, gSchema$Event } from "@core/types/gcal";
import { GcalParser } from "@backend/event/services/recur/util/recur.gcal.util";
import { Change_Gcal, Operation_Sync } from "../../sync.types";

export class GcalSyncProcessor {
  constructor(
    private gcal: gCalendar,
    private userId: string,
  ) {}

  async processEvents(events: gSchema$Event[]): Promise<Change_Gcal[]> {
    console.log(
      "gcal",
      this.gcal?.settings?.context?._options?.auth?.toString(),
      this.userId,
    );
    const summary: Change_Gcal[] = [];
    console.log(`Processing ${events.length} events...`);
    for (const event of events) {
      const parser = new GcalParser(event);
      const category = parser.category;
      const status = parser.status;
      const change = parser.summarize();
      let operation: Operation_Sync = null;
      // --- Cancellation Logic ---
      if (status === "CANCELLED") {
        if (category === "RECURRENCE_BASE") {
          // Cancelled Master Event
          // console.log(`Processing cancelled base: ${event.summary}`);
          operation = "CANCELLED";
          // TODO: delete base + linked instances
        } else {
          // console.log(`Processing cancelled instance: ${event.summary}`);
          operation = "CANCELLED";
        }
      }

      // --- Upsert Logic for Active Events ---
      else {
        /*
        START HERE ON TUESDAY
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
