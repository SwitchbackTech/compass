import { type Schema_GridEvent } from "@web/common/types/web.event.types";

export type InteractionMode = "idle" | "drag" | "resize";

export interface InteractionPointer {
  x: number;
  y: number;
}

export interface InteractionState {
  mode: InteractionMode;
  pointer: InteractionPointer | null;
  draft: Schema_GridEvent | null;
  drag: {
    durationMin: number | null;
    hasMoved: boolean;
  };
  resize: {
    hasMoved: boolean;
  };
  scroll: {
    velocityY: number;
  };
  edge: {
    side: "left" | "right" | null;
    progress: number;
  };
}
