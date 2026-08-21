import { act, render, screen } from "@testing-library/react";
import { PointerHint } from "@web/components/PointerHint/PointerHint";
import {
  initialPointerBlockState,
  pointerBlockActions,
  usePointerBlockStore,
} from "@web/shortcuts/keyboard-only/pointer-block.store";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

describe("PointerHint", () => {
  beforeEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
  });

  afterEach(() => {
    usePointerBlockStore.setState(initialPointerBlockState, true);
  });

  it("stays hidden until a click is blocked, then teaches", () => {
    render(<PointerHint />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      pointerBlockActions.pulseBlockedClick();
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Compass is keyboard only. Press ? for shortcuts.",
    );
  });
});
