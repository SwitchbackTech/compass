import { type Schema_GridEvent } from "@web/common/types/web.event.types";
import { type TimedResizeEdge } from "./model/TimedResizeVisual";

export type WeekInteractionPhase = "idle" | "pending" | "motion" | "commit";

export interface IdleWeekInteractionSession {
  phase: "idle";
}

export type TimedDragActivationReason = "hold" | "move";

export interface PendingTimedDragSession {
  eventId: string;
  formEventIdAtPointerDown: string | null;
  formOpenAtPointerDown: boolean;
  holdTimer: unknown;
  kind: "timed";
  phase: "pending";
  pointerId: number;
  sourceElement: HTMLElement;
  startX: number;
  startY: number;
  startedAt: number;
}

export interface ActiveTimedDragSession
  extends Omit<PendingTimedDragSession, "holdTimer" | "phase"> {
  activatedBy: TimedDragActivationReason;
  phase: "motion";
}

export interface PendingTimedResizeSession
  extends Omit<PendingTimedDragSession, "kind"> {
  edge: TimedResizeEdge;
  kind: "timedResize";
}

export interface ActiveTimedResizeSession
  extends Omit<PendingTimedResizeSession, "holdTimer" | "phase"> {
  activatedBy: TimedDragActivationReason;
  phase: "motion";
}

export interface PendingAllDayDragSession
  extends Omit<PendingTimedDragSession, "kind"> {
  kind: "allDayDrag";
}

export interface ActiveAllDayDragSession
  extends Omit<PendingAllDayDragSession, "holdTimer" | "phase"> {
  activatedBy: TimedDragActivationReason;
  phase: "motion";
}

export type WeekInteractionSession =
  | IdleWeekInteractionSession
  | PendingTimedDragSession
  | ActiveTimedDragSession
  | PendingTimedResizeSession
  | ActiveTimedResizeSession
  | PendingAllDayDragSession
  | ActiveAllDayDragSession;

export type WeekInteractionPointerUpResult =
  | { event: Schema_GridEvent; eventId: string; type: "click" }
  | {
      event: Schema_GridEvent;
      formEventIdAtPointerDown: string | null;
      hadFormOpenBeforeInteraction: boolean;
      eventId: string;
      hasMoved: boolean;
      type: "timedDragEnd";
    }
  | {
      event: Schema_GridEvent;
      formEventIdAtPointerDown: string | null;
      hadFormOpenBeforeInteraction: boolean;
      eventId: string;
      hasMoved: boolean;
      type: "timedResizeEnd";
    }
  | {
      event: Schema_GridEvent;
      formEventIdAtPointerDown: string | null;
      hadFormOpenBeforeInteraction: boolean;
      eventId: string;
      hasMoved: boolean;
      type: "allDayDragEnd";
    }
  | null;
