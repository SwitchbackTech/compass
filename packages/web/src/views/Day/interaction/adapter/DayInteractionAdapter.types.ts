import { type Dayjs } from "@core/util/date/dayjs";
import { type CalendarLayoutCacheSources } from "@web/common/calendar-grid/interaction/calendarLayoutCache";
import { type AllDayDragVisual } from "@web/common/calendar-grid/interaction/model/AllDayDragVisual";
import {
  type AllDayResizeEdge,
  type AllDayResizeVisual,
} from "@web/common/calendar-grid/interaction/model/AllDayResizeVisual";
import { type TimedDragVisual } from "@web/common/calendar-grid/interaction/model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "@web/common/calendar-grid/interaction/model/TimedResizeVisual";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngineSchedulerOptions,
} from "@web/common/calendar-interaction/CalendarInteractionEngine";
import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type DayInteractionRegisteredTarget } from "../registry/dayCalendarEventRegistry";

export interface DayInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

export interface DayInteractionAdapterOptions {
  engineOptions?: CalendarInteractionEngineSchedulerOptions;
  getLayoutSources?: () => CalendarLayoutCacheSources;
  getVisibleDate?: () => Dayjs;
  runtime?: () => DayInteractionRuntime;
}

export interface DayInteractionRuntime {
  getAllDayEventById?: (eventId: string) => Schema_GridEvent | null;
  getTimedEventById(eventId: string): Schema_GridEvent | null;
  isFormOpen?: () => boolean;
  onClickAllDayEvent?: (event: Schema_GridEvent) => void;
  onClickTimedEvent: (event: Schema_GridEvent) => void;
  onCommitAllDayDrag?: (result: DayAllDayDragCommitResult) => void;
  onCommitAllDayResize?: (result: DayAllDayResizeCommitResult) => void;
  onCommitTimedDrag: (result: DayTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: DayTimedResizeCommitResult) => void;
  onMotionActivation?: (target: DayInteractionTarget) => void;
}

export interface DayAllDayDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayDragEnd";
}

export interface DayAllDayDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "allDayDrag";
}

export interface DayAllDayResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayResizeEnd";
}

export interface DayAllDayResizeTarget {
  edge: AllDayResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "allDayResize";
}

export interface DayTimedDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedDragEnd";
}

export interface DayTimedDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "timedDrag";
}

export interface DayTimedResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedResizeEnd";
}

export interface DayTimedResizeTarget {
  edge: TimedResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "timedResize";
}

export type DayInteractionTarget =
  | DayAllDayDragTarget
  | DayAllDayResizeTarget
  | DayTimedDragTarget
  | DayTimedResizeTarget;

export type DayInteractionVisual =
  | AllDayDragVisual
  | AllDayResizeVisual
  | TimedDragVisual
  | TimedResizeVisual;

export type DayInteractionCommitResult =
  | DayAllDayDragCommitResult
  | DayAllDayResizeCommitResult
  | DayTimedDragCommitResult
  | DayTimedResizeCommitResult;

export type DayResolvedEventTarget = {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
};

export interface DayInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): DayInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
}
