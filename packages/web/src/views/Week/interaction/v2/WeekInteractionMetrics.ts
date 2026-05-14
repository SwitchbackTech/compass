export interface WeekInteractionMetrics {
  active: boolean;
  phase: "idle" | "pending" | "motion" | "commit";
  pointerMoveCount: number;
  rafCount: number;
  reactCommitsDuringMotion: number;
  reactCommitDurationsDuringMotion: number[];
  reduxDispatchesDuringMotion: number;
  reduxActionTypesDuringMotion: string[];
  domMutationsDuringMotion: number;
  unexpectedDomMutationsDuringMotion: string[];
  layoutReadsDuringMotion: number;
  styleWritesDuringMotion: number;
  rafDurations: number[];
  frameGaps: number[];
  firstFrameLatencyMs: number | null;
  overlayMountMs: number | null;
  saveRequestsDuringMotion: number;
  saveRequestsAfterPointerUp: number;
}

export const createWeekInteractionMetrics = (): WeekInteractionMetrics => ({
  active: false,
  domMutationsDuringMotion: 0,
  firstFrameLatencyMs: null,
  frameGaps: [],
  layoutReadsDuringMotion: 0,
  overlayMountMs: null,
  phase: "idle",
  pointerMoveCount: 0,
  rafCount: 0,
  rafDurations: [],
  reactCommitDurationsDuringMotion: [],
  reactCommitsDuringMotion: 0,
  reduxActionTypesDuringMotion: [],
  reduxDispatchesDuringMotion: 0,
  saveRequestsAfterPointerUp: 0,
  saveRequestsDuringMotion: 0,
  styleWritesDuringMotion: 0,
  unexpectedDomMutationsDuringMotion: [],
});

declare global {
  interface Window {
    __weekInteractionV2ForceEnabled?: boolean;
    __weekInteractionMetrics?: WeekInteractionMetrics;
  }
}
