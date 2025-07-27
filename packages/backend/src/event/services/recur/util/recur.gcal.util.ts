import { Categories_Recurrence } from "@core/types/event.types";
import { gSchema$Event } from "@core/types/gcal";
import {
  isBaseGCalEvent,
  isCancelledGCalEvent,
  isInstanceGCalEvent,
  isRegularGCalEvent,
} from "@core/util/event/gcal.event.util";

export class GcalParser {
  public cancelled: boolean;
  public isInstance: boolean;
  public isBase: boolean;
  public isStandalone: boolean;
  public category: Categories_Recurrence;
  public status: "CANCELLED" | "ACTIVE";
  public title: string;
  public summary: { title: string; category: Categories_Recurrence };

  constructor(private event: gSchema$Event) {
    this.cancelled = isCancelledGCalEvent(event);
    this.isInstance = isInstanceGCalEvent(event);
    this.isBase = isBaseGCalEvent(event);
    this.isStandalone = isRegularGCalEvent(event);
    this.category = this.getCategory();
    this.status = this.cancelled ? "CANCELLED" : "ACTIVE";
    this.title = this.event.summary ?? this.event.id ?? "unknown";
    this.summary = { title: this.title, category: this.category };
  }

  private getCategory() {
    switch (true) {
      case this.isStandalone:
        return Categories_Recurrence.STANDALONE;
      case this.isBase:
        return Categories_Recurrence.RECURRENCE_BASE;
      case this.isInstance:
        return Categories_Recurrence.RECURRENCE_INSTANCE;
      default:
        throw new Error("could not determine event category");
    }
  }
}
