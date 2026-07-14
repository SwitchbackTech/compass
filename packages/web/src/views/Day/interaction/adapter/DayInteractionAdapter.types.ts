import { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import {
  type CalendarInteractionCancellationTargets,
  type CalendarInteractionEngineSchedulerOptions,
} from "@web/interaction/CalendarInteractionEngine";
import { type CalendarLayoutCacheSources } from "@web/layout/calendar-grid/interaction/calendarLayoutCache";
import { type AllDayDragVisual } from "@web/layout/calendar-grid/interaction/model/AllDayDragVisual";
import {
  type AllDayResizeEdge,
  type AllDayResizeVisual,
} from "@web/layout/calendar-grid/interaction/model/AllDayResizeVisual";
import { type TimedDragVisual } from "@web/layout/calendar-grid/interaction/model/TimedDragVisual";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "@web/layout/calendar-grid/interaction/model/TimedResizeVisual";
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
  getAllDayEventById?: (eventId: string) => GridEvent | null;
  getTimedEventById(eventId: string): GridEvent | null;
  isFormOpen?: () => boolean;
  onClickAllDayEvent?: (event: GridEvent) => void;
  onClickTimedEvent: (event: GridEvent) => void;
  onCommitAllDayDrag?: (result: DayAllDayDragCommitResult) => void;
  onCommitAllDayResize?: (result: DayAllDayResizeCommitResult) => void;
  onCommitTimedDrag: (result: DayTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: DayTimedResizeCommitResult) => void;
  onMotionActivation?: (target: DayInteractionTarget) => void;
}

export interface DayAllDayDragCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayDragEnd";
}

export interface DayAllDayDragTarget {
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "allDayDrag";
}

export interface DayAllDayResizeCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayResizeEnd";
}

export interface DayAllDayResizeTarget {
  edge: AllDayResizeEdge;
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "allDayResize";
}

export interface DayTimedDragCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedDragEnd";
}

export interface DayTimedDragTarget {
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: DayInteractionRegisteredTarget;
  type: "timedDrag";
}

export interface DayTimedResizeCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedResizeEnd";
}

export interface DayTimedResizeTarget {
  edge: TimedResizeEdge;
  event: GridEvent;
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
  event: GridEvent;
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
