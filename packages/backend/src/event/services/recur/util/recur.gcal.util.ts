import { Categories_Recurrence } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export class GcalParser {
  constructor(private event: gSchema$Event) {
    this.category = this.getCategory();
    this.status = this.getStatus();
  }
  public category: Categories_Recurrence;
  public status: "CANCELLED" | "ACTIVE";

  public summarize() {
    return {
      title: this.event.summary || this.event.id || "unknown",
      category: this.category,
    };
  }
  private getCategory() {
    if (this.isRecurrenceBase()) {
      return Categories_Recurrence.RECURRENCE_BASE;
    } else if (this.isRecurrenceInstance()) {
      return Categories_Recurrence.RECURRENCE_INSTANCE;
    } else {
      return Categories_Recurrence.STANDALONE;
    }
  }
  private getStatus() {
    if (this.isCancelled()) {
      return "CANCELLED";
    } else {
      return "ACTIVE";
    }
  }
  public isRecurrenceBase() {
    const isBase = this.event.recurrence !== undefined;
    // Recurring cancellations include the recurringEventId;
    // base cancellations do not
    const isBaseCancellation =
      this.event.status === "cancelled" && !this.event.recurringEventId;
    return isBase || isBaseCancellation;
  }
  private isRecurrenceInstance() {
    return (
      this.event.recurrence === undefined &&
      this.event.recurringEventId !== undefined &&
      this.event.recurringEventId !== null
    );
  }
  private isCancelled() {
    return this.event.status === "cancelled";
  }
}
