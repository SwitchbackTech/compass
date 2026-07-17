export type InteractionPhase =
  | "idle"
  | "pending"
  | "motion"
  | "commit"
  | "cancelled";

export interface InteractionPoint {
  x: number;
  y: number;
}

export interface IdleInteractionSession {
  phase: "idle";
}

export interface PendingInteractionSession<TTarget> {
  holdTimer: unknown;
  phase: "pending";
  pointerId: number;
  sourceElement: HTMLElement;
  startPoint: InteractionPoint;
  target: TTarget;
}

export interface MotionInteractionSession<TTarget, TVisual>
  extends Omit<PendingInteractionSession<TTarget>, "holdTimer" | "phase"> {
  activatedBy: "hold" | "move";
  phase: "motion";
  visual: TVisual;
}

export type InteractionSession<TTarget = unknown, TVisual = unknown> =
  | IdleInteractionSession
  | PendingInteractionSession<TTarget>
  | MotionInteractionSession<TTarget, TVisual>;

export type InteractionPointerUpResult<TTarget, TResult> =
  | { target: TTarget; type: "click" }
  | { result: TResult; type: "commit" }
  | null;
