export type CalendarInteractionPhase =
  | "idle"
  | "pending"
  | "motion"
  | "commit"
  | "cancelled";

export interface CalendarInteractionPoint {
  x: number;
  y: number;
}

export interface IdleCalendarInteractionSession {
  phase: "idle";
}

export interface PendingCalendarInteractionSession<TTarget> {
  holdTimer: unknown;
  phase: "pending";
  pointerId: number;
  sourceElement: HTMLElement;
  startPoint: CalendarInteractionPoint;
  target: TTarget;
}

export interface MotionCalendarInteractionSession<TTarget, TVisual>
  extends Omit<
    PendingCalendarInteractionSession<TTarget>,
    "holdTimer" | "phase"
  > {
  activatedBy: "hold" | "move";
  phase: "motion";
  visual: TVisual;
}

export type CalendarInteractionSession<TTarget = unknown, TVisual = unknown> =
  | IdleCalendarInteractionSession
  | PendingCalendarInteractionSession<TTarget>
  | MotionCalendarInteractionSession<TTarget, TVisual>;

export type CalendarInteractionPointerUpResult<TTarget, TResult> =
  | { target: TTarget; type: "click" }
  | { result: TResult; type: "commit" }
  | null;
