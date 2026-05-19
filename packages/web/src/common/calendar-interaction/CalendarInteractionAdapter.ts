import { type CalendarInteractionPoint } from "./CalendarInteractionSession";

export interface FloatingInteractionOverlayMount {
  clone: HTMLElement;
  cursor?: string;
  rect: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
}

export type FloatingInteractionOverlayUpdate = {
  height?: number;
  mutate?: (node: HTMLElement) => void;
  transform: CalendarInteractionPoint;
  width?: number;
} | null;

export type SourceElementOverlayMode = "hide-source" | "dim-source";

export interface CalendarInteractionAdapter<TTarget, TVisual, TResult> {
  getTarget(event: PointerEvent): TTarget | null;
  getSourceElement(target: TTarget): HTMLElement;
  getSourceElementOverlayMode?(target: TTarget): SourceElementOverlayMode;
  createVisual(input: {
    pointerStart: CalendarInteractionPoint;
    sourceElement: HTMLElement;
    target: TTarget;
  }): TVisual | null;
  getOverlayMount(input: {
    sourceElement: HTMLElement;
    target: TTarget;
    visual: TVisual;
  }): FloatingInteractionOverlayMount;
  updateVisual(input: {
    pointer: CalendarInteractionPoint;
    target: TTarget;
    timestamp: number;
    visual: TVisual;
  }): {
    overlay: FloatingInteractionOverlayUpdate;
    shouldContinue?: boolean;
    visual: TVisual;
  };
  commit(input: { target: TTarget; visual: TVisual }): TResult;
  cancel?(input: { target: TTarget; visual?: TVisual }): void;
}
