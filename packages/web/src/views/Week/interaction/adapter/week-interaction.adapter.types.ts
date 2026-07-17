import { type GridEvent } from "@web/common/types/web.event.types";
import { type AllDayDragVisual } from "@web/grid/interaction/types/all-day-drag.types";
import {
  type AllDayResizeEdge,
  type AllDayResizeVisual,
} from "@web/grid/interaction/types/all-day-resize.types";
import { type TimedDragVisual } from "@web/grid/interaction/types/timed-drag.types";
import {
  type TimedResizeEdge,
  type TimedResizeVisual,
} from "@web/grid/interaction/types/timed-resize.types";
import {
  type InteractionCancellationTargets,
  type InteractionEngineSchedulerOptions,
} from "@web/interaction/interaction.engine";
import { type WeekRegisteredEventTarget } from "../registry/week-event.registry";
import { type WeekLayoutCacheSources } from "./geometry/week-layout.cache";

export interface WeekInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

export interface WeekInteractionAdapterOptions {
  engineOptions?: InteractionEngineSchedulerOptions;
  getLayoutSources?: () => WeekLayoutCacheSources;
  runtime?: () => WeekInteractionRuntime;
}

export interface WeekInteractionRuntime {
  getAllDayEventById?: (eventId: string) => GridEvent | null;
  getTimedEventById(eventId: string): GridEvent | null;
  /**
   * Local YYYY-MM-DD dates of the rendered day columns, in window order.
   * Sourced from the same React render that painted the columns so drag
   * geometry and drop dates always agree with what is on screen.
   */
  getVisibleDays(): string[];
  isFormOpen?: () => boolean;
  onClickAllDayEvent?: (event: GridEvent) => void;
  onClickTimedEvent: (event: GridEvent) => void;
  onCommitAllDayDrag?: (result: WeekAllDayDragCommitResult) => void;
  onCommitAllDayResize?: (result: WeekAllDayResizeCommitResult) => void;
  onCommitTimedDrag: (result: WeekTimedDragCommitResult) => void;
  onCommitTimedResize?: (result: WeekTimedResizeCommitResult) => void;
  onMotionActivation?: (target: WeekInteractionTarget) => void;
  onRequestWeekNavigation?: (direction: "next" | "prev") => void;
}

export interface WeekAllDayDragCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayDragEnd";
}

export interface WeekAllDayDragTarget {
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekRegisteredEventTarget;
  type: "allDayDrag";
}

export interface WeekAllDayResizeCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "allDayResizeEnd";
}

export interface WeekAllDayResizeTarget {
  edge: AllDayResizeEdge;
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekRegisteredEventTarget;
  type: "allDayResize";
}

export interface WeekTimedDragCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedDragEnd";
}

export interface WeekTimedDragTarget {
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekRegisteredEventTarget;
  type: "timedDrag";
}

export interface WeekTimedResizeCommitResult {
  event: GridEvent;
  eventId: string;
  hadFormOpenBeforeInteraction: boolean;
  hasMoved: boolean;
  type: "timedResizeEnd";
}

export interface WeekTimedResizeTarget {
  edge: TimedResizeEdge;
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekRegisteredEventTarget;
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
  event: GridEvent;
  hadFormOpenBeforeInteraction: boolean;
  registered: WeekRegisteredEventTarget;
};

export interface WeekInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: InteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): WeekInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
  rebuildLayoutAfterNavigation(): void;
}
