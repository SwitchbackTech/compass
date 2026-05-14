import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export type WeekInteractionPhase = "idle" | "pending" | "motion" | "commit";

export interface IdleWeekInteractionSession {
  phase: "idle";
}

export type TimedDragActivationReason = "hold" | "move";

export interface PendingTimedDragSession {
  eventId: string;
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

export type WeekInteractionSession =
  | IdleWeekInteractionSession
  | PendingTimedDragSession
  | ActiveTimedDragSession;

export type WeekInteractionPointerUpResult =
  | { event: Schema_GridEvent; eventId: string; type: "click" }
  | {
      event: Schema_GridEvent;
      eventId: string;
      hasMoved: boolean;
      type: "timedDragEnd";
    }
  | null;
