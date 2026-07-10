import { type CalendarInteractionPoint } from "./CalendarInteractionSession";

export interface FloatingDraftEventMount {
  clone: HTMLElement;
  cursor?: string;
  rect: {
    height: number;
    left: number;
    top: number;
    width: number;
  };
}

export type FloatingDraftEventUpdate = {
  height?: number;
  mutate?: (node: HTMLElement) => void;
  transform: CalendarInteractionPoint;
  width?: number;
} | null;

export type SourceElementDraftEventMode = "hide-source" | "dim-source";

export interface CalendarInteractionAdapter<TTarget, TVisual, TResult> {
  getTarget(event: PointerEvent): TTarget | null;
  getSourceElement(target: TTarget): HTMLElement;
  getSourceElementDraftEventMode?(target: TTarget): SourceElementDraftEventMode;
  createVisual(input: {
    pointerStart: CalendarInteractionPoint;
    sourceElement: HTMLElement;
    target: TTarget;
  }): TVisual | null;
  getDraftEventMount(input: {
    sourceElement: HTMLElement;
    target: TTarget;
    visual: TVisual;
  }): FloatingDraftEventMount;
  // Must be idempotent for a given pointer: the engine re-invokes this at
  // pointerup with the same pointer to recompute the visual before commit.
  updateVisual(input: {
    pointer: CalendarInteractionPoint;
    target: TTarget;
    timestamp: number;
    visual: TVisual;
  }): {
    draftEvent: FloatingDraftEventUpdate;
    shouldContinue?: boolean;
    visual: TVisual;
  };
  commit(input: { target: TTarget; visual: TVisual }): TResult;
  cancel?(input: { target: TTarget; visual?: TVisual }): void;
}
