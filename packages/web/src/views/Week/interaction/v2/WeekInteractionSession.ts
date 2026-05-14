export type WeekInteractionPhase = "idle" | "pending" | "motion" | "commit";

export interface IdleWeekInteractionSession {
  phase: "idle";
}

export type WeekInteractionSession = IdleWeekInteractionSession;
