import { Category_Event } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";

export class GcalParser {
  constructor(private event: gSchema$Event) {
    this.category = this.getCategory();
    this.status = this.getStatus();
  }
  public category: Category_Event;
  public status: "CANCELLED" | "ACTIVE";

  public summarize() {
    return {
      title: this.event.summary || this.event.id || "unknown",
      category: this.category,
      changeType: this.status,
    };
  }
  private getCategory() {
    if (this.isRecurrenceBase()) {
      return Category_Event.RECURRENCE_BASE;
    } else if (this.isRecurrenceInstance()) {
      return Category_Event.RECURRENCE_INSTANCE;
    } else {
      return Category_Event.STANDALONE;
    }
  }
  private getStatus() {
    if (this.isCancelled()) {
      return "CANCELLED";
    } else {
      return "ACTIVE";
    }
  }
  private isRecurrenceBase() {
    return (
      this.event.recurrence !== undefined &&
      this.event.recurringEventId === undefined
    );
  }
  private isRecurrenceInstance() {
    return (
      this.event.recurrence === undefined &&
      this.event.recurringEventId !== undefined
    );
  }
  private isCancelled() {
    return this.event.status === "cancelled";
  }
}
