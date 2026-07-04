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
import { type WeekInteractionRegisteredTarget } from "../registry/weekEventRegistry";
import { type WeekLayoutCacheSources } from "./geometry/weekLayoutCache";

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

export interface WeekInteractionAdapterOptions {
  engineOptions?: CalendarInteractionEngineSchedulerOptions;
  getLayoutSources?: () => WeekLayoutCacheSources;
  runtime?: () => WeekInteractionRuntime;
}

export interface WeekInteractionRuntime {
  getAllDayEventById?: (eventId: string) => Schema_GridEvent | null;
  getTimedEventById(eventId: string): Schema_GridEvent | null;
  isFormOpen?: () => boolean;
  onClickAllDayEvent?: (event: Schema_GridEvent) => void;
  onClickTimedEvent: (event: Schema_GridEvent) => void;
  onCommitAllDayDrag?: (result: WeekAllDayDragCommitResult) => void;
  onCommitAllDayResize?: (result: WeekAllDayResizeCommitResult) => void;
  onCommitTimedDrag: (result: WeekTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: WeekTimedResizeCommitResult) => void;
  onMotionActivation?: (target: WeekInteractionTarget) => void;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
}

export interface WeekAllDayDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayDragEnd";
}

export interface WeekAllDayDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "allDayDrag";
}

export interface WeekAllDayResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayResizeEnd";
}

export interface WeekAllDayResizeTarget {
  edge: AllDayResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "allDayResize";
}

export interface WeekTimedDragCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedDragEnd";
}

export interface WeekTimedDragTarget {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "timedDrag";
}

export interface WeekTimedResizeCommitResult {
  event: Schema_GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedResizeEnd";
}

export interface WeekTimedResizeTarget {
  edge: TimedResizeEdge;
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
  type: "timedResize";
}

export type WeekInteractionTarget =
  | WeekAllDayDragTarget
  | WeekAllDayResizeTarget
  | WeekTimedDragTarget
  | WeekTimedResizeTarget;

export type WeekInteractionVisual =
  | AllDayDragVisual
  | AllDayResizeVisual
  | TimedDragVisual
  | TimedResizeVisual;

export type WeekInteractionCommitResult =
  | WeekAllDayDragCommitResult
  | WeekAllDayResizeCommitResult
  | WeekTimedDragCommitResult
  | WeekTimedResizeCommitResult;

export type WeekEdgeNavigableVisual = AllDayDragVisual | TimedDragVisual;

export type WeekResolvedEventTarget = {
  event: Schema_GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekInteractionRegisteredTarget;
};

export interface WeekInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: CalendarInteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): WeekInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
  rebuildLayoutAfterNavigation(): void;
}
