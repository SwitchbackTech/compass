import { type InteractionPhase } from "./interaction.types";

export interface InteractionMetrics {
  active: boolean;
  cancellationCount: number;
  firstFrameLatencyMs: number | null;
  frameGaps: number[];
  draftEventMountMs: number | null;
  phase: InteractionPhase;
  pointerMoveCount: number;
  rafCount: number;
  rafDurations: number[];
  styleWritesDuringMotion: number;
}

export const createInteractionMetrics = (): InteractionMetrics => ({
  active: false,
  cancellationCount: 0,
  firstFrameLatencyMs: null,
  frameGaps: [],
  draftEventMountMs: null,
  phase: "idle",
  pointerMoveCount: 0,
  rafCount: 0,
  rafDurations: [],
  styleWritesDuringMotion: 0,
});
