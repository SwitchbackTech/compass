import { type Dayjs } from "@core/util/date/dayjs";
import { type GridEvent } from "@web/common/types/web.event.types";
import { type GridLayoutCacheSources } from "@web/grid/interaction/layout.cache";
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
import { type DayRegisteredEventTarget } from "../registry/day-event.registry";

export interface DayInteractionPointerOwnership {
  reason: string;
  shouldOwn: boolean;
}

export interface DayInteractionAdapterOptions {
  engineOptions?: InteractionEngineSchedulerOptions;
  /**
   * Ordered keys of the rendered per-calendar columns (calendar ids, one per
   * displayed calendar). Drags hit-test against these so an event can be
   * dropped on another calendar's column; empty means a single dateless
   * column (no calendar columns rendered), which disables cross-column
   * movement.
   */
  getColumnKeys?: () => string[];
  getLayoutSources?: () => GridLayoutCacheSources;
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
  registered: DayRegisteredEventTarget;
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
  registered: DayRegisteredEventTarget;
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
  registered: DayRegisteredEventTarget;
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
  registered: DayRegisteredEventTarget;
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
  registered: DayRegisteredEventTarget;
};

export interface DayInteractionAdapter {
  cancel(): void;
  connectCancellationEvents(
    targets?: InteractionCancellationTargets,
  ): () => void;
  handlePointerCancel(event: PointerEvent): boolean;
  handlePointerDown(event: PointerEvent): DayInteractionPointerOwnership;
  handlePointerMove(event: PointerEvent): boolean;
  handlePointerUp(event: PointerEvent): boolean;
  ownsPointer(event: Pick<PointerEvent, "pointerId">): boolean;
}
