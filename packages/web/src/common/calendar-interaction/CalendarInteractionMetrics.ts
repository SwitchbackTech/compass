import { type CalendarInteractionPhase } from "./CalendarInteractionSession";

export interface CalendarInteractionMetrics {
  active: boolean;
  cancellationCount: number;
  firstFrameLatencyMs: number | null;
  frameGaps: number[];
  layoutReadsDuringMotion: number;
  overlayMountMs: number | null;
  phase: CalendarInteractionPhase;
  pointerMoveCount: number;
  rafCount: number;
  rafDurations: number[];
  saveRequestsDuringMotion: number;
  styleWritesDuringMotion: number;
}

export const createCalendarInteractionMetrics =
  (): CalendarInteractionMetrics => ({
    active: false,
    cancellationCount: 0,
    firstFrameLatencyMs: null,
    frameGaps: [],
    layoutReadsDuringMotion: 0,
    overlayMountMs: null,
    phase: "idle",
    pointerMoveCount: 0,
    rafCount: 0,
    rafDurations: [],
    saveRequestsDuringMotion: 0,
    styleWritesDuringMotion: 0,
  });
