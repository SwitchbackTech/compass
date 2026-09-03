import { act, renderHook } from "@testing-library/react";
import {
  POINTER_CONFUSION_THRESHOLD,
  pointerConfusionActions,
  selectPointerConfusionHintPulse,
  selectPointerConfusionScore,
  usePointerConfusionStore,
} from "@web/shortcuts/keyboard-only/pointer-confusion.store";
import { resetPointerHintPersistenceForTests } from "@web/shortcuts/keyboard-only/pointer-hint.storage";
import { beforeEach, describe, expect, it } from "bun:test";

describe("pointerConfusionActions", () => {
  beforeEach(() => {
    resetPointerHintPersistenceForTests();
    pointerConfusionActions.resetForTests();
  });

  it("shows the hint when the score reaches the threshold", () => {
    for (let i = 0; i < POINTER_CONFUSION_THRESHOLD - 1; i += 1) {
      pointerConfusionActions.recordDeadClick({ actionId: "unknown" });
    }
    expect(usePointerConfusionStore.getState().hintPulse).toBe(0);

    pointerConfusionActions.recordDeadClick({ actionId: "unknown" });

    expect(usePointerConfusionStore.getState().hintPulse).toBe(1);
    expect(usePointerConfusionStore.getState().score).toBe(0);
  });

  it("subtracts for copy and keyboard signals", () => {
    pointerConfusionActions.recordDeadClick({ actionId: "unknown" });
    pointerConfusionActions.recordDeadClick({ actionId: "unknown" });
    pointerConfusionActions.recordCopyButtonClick();
    pointerConfusionActions.recordKeyboardSuccess();

    expect(usePointerConfusionStore.getState().score).toBe(0);
  });
});

describe("pointer confusion selectors", () => {
  beforeEach(() => {
    pointerConfusionActions.resetForTests();
  });

  it("exposes score and hint pulse", () => {
    const { result, rerender } = renderHook(() => ({
      score: usePointerConfusionStore(selectPointerConfusionScore),
      pulse: usePointerConfusionStore(selectPointerConfusionHintPulse),
    }));

    expect(result.current.score).toBe(0);
    act(() => {
      pointerConfusionActions.recordDeadClick({ actionId: "unknown" });
    });
    rerender();
    expect(result.current.score).toBe(1);
  });
});
