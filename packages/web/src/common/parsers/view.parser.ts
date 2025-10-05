import dayjs, { Dayjs } from "@core/util/date/dayjs";
import { Schema_WebEvent } from "@web/common/types/web.event.types";
import { WeekNavigationSource } from "@web/views/Calendar/hooks/useWeek";

export class EventInViewParser {
  private readonly event: Schema_WebEvent;
  private readonly startOfView: Dayjs;
  private readonly endOfView: Dayjs;
  private readonly isStartInView: boolean;
  private readonly isEndInView: boolean;
  private readonly isSpanningView: boolean;

  constructor(event: Schema_WebEvent, startOfView: Dayjs, endOfView: Dayjs) {
    this.event = event;
    this.startOfView = startOfView;
    this.endOfView = endOfView;
    this.isStartInView = this.isWithinView(this.event.startDate);
    this.isEndInView = this.isWithinView(this.event.endDate);

    this.isSpanningView =
      dayjs(this.event.startDate).isBefore(this.startOfView) &&
      dayjs(this.event.endDate).isAfter(this.endOfView);
  }

  private isWithinView = (date: string) =>
    dayjs(date).isBetween(this.startOfView, this.endOfView, null, "[]");

  public isEventInView() {
    return this.isStartInView || this.isEndInView || this.isSpanningView;
  }

  public isEventOutsideView() {
    return !this.isStartInView && !this.isEndInView && !this.isSpanningView;
  }

  public shouldAddToViewAfterDragToEdge(
    lastNavSource: WeekNavigationSource,
    idsInView: string[],
  ) {
    const isDraggingToEdge = lastNavSource === "drag-to-edge";
    const wasMoved = !this.isEventOutsideView() && this.isEventInView();
    const isAlreadyVisible = idsInView.includes(this.event._id!);
    return isDraggingToEdge && wasMoved && !isAlreadyVisible;
  }
}
