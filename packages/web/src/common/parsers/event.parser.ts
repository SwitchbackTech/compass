import { Schema_WebEvent } from "../types/web.event.types";
import {
  prepEvtBeforeSubmit,
  prepSomedayEventBeforeSubmit,
} from "../utils/event.util";

export class EventParser {
  private readonly event: Schema_WebEvent;

  constructor(event: Schema_WebEvent) {
    this.event = event;
  }

  public parse() {
    console.log("this.event", this.event);
    if (this.event.isSomeday) {
      return prepSomedayEventBeforeSubmit(this.event, this.event.user);
    }
    return prepEvtBeforeSubmit(this.event, this.event.user);
  }
}
