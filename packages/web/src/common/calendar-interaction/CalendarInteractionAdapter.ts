import { type CalendarInteractionPoint } from "./CalendarInteractionSession";

export interface CalendarInteractionOverlayMount {
  clone: HTMLElement;
  cursor?: string;
  rect: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
}

export type CalendarInteractionOverlayUpdate = {
  height?: number;
  mutate?: (node: HTMLElement) => void;
  transform: CalendarInteractionPoint;
  width?: number;
} | null;

export interface CalendarInteractionAdapter<TTarget, TVisual, TResult> {
  getTarget(event: PointerEvent): TTarget | null;
  getSourceElement(target: TTarget): HTMLElement;
  createVisual(input: {
    pointerStart: CalendarInteractionPoint;
    sourceElement: HTMLElement;
    target: TTarget;
  }): TVisual | null;
  getOverlayMount(input: {
    sourceElement: HTMLElement;
    target: TTarget;
    visual: TVisual;
  }): CalendarInteractionOverlayMount;
  updateVisual(input: {
    pointer: CalendarInteractionPoint;
    target: TTarget;
    timestamp: number;
    visual: TVisual;
  }): {
    overlay: CalendarInteractionOverlayUpdate;
    shouldContinue?: boolean;
    visual: TVisual;
  };
  commit(input: { target: TTarget; visual: TVisual }): TResult;
  cancel?(input: { target: TTarget; visual?: TVisual }): void;
}
