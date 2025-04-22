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
    if (this.isCancelled()) {
      if (this.isCancelledInstance()) {
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      }
      // Fall back to base recurrence, but could also be standalone.
      // Unable to determine the difference from payload alone, so
      // so using this default for simplicity to avoid a DB lookup.
      // This ambiguity means that the processor needs to base its
      // conditional logic primarily on the status, not category
      return Categories_Recurrence.RECURRENCE_BASE;
    }
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
    const isBase =
      this.event.recurrence !== undefined && !this.event.recurringEventId;
    return isBase;
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
  private isCancelledInstance() {
    return (
      this.event.originalStartTime !== undefined &&
      this.event.recurringEventId !== undefined
    );
  }
}
