import { type InteractionPhase } from "./interaction.types";

export interface InteractionMetrics {
  active: boolean;
  cancellationCount: number;
  firstFrameLatencyMs: number | null;
  frameGaps: number[];
  layoutReadsDuringMotion: number;
  draftEventMountMs: number | null;
  phase: InteractionPhase;
  pointerMoveCount: number;
  rafCount: number;
  rafDurations: number[];
  saveRequestsDuringMotion: number;
  styleWritesDuringMotion: number;
}

export const createInteractionMetrics = (): InteractionMetrics => ({
  active: false,
  cancellationCount: 0,
  firstFrameLatencyMs: null,
  frameGaps: [],
  layoutReadsDuringMotion: 0,
  draftEventMountMs: null,
  phase: "idle",
  pointerMoveCount: 0,
  rafCount: 0,
  rafDurations: [],
  saveRequestsDuringMotion: 0,
  styleWritesDuringMotion: 0,
});
