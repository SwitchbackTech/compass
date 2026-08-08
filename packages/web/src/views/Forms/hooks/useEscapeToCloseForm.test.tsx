import { HotkeyManager } from "@tanstack/react-hotkeys";
import { renderHook } from "@testing-library/react";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import {
  clearFloatingLayerReasons,
  setFloatingLayerReason,
} from "@web/shortcuts/floating-layer";
import { useEscapeToCloseForm } from "@web/views/Forms/hooks/useEscapeToCloseForm";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

describe("useEscapeToCloseForm", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");
    clearFloatingLayerReasons();
  });

  afterEach(() => {
    clearFloatingLayerReasons();
  });

  it("closes the form on Escape when no floating layer is open", () => {
    const onClose = mock(() => {});
    renderHook(() => useEscapeToCloseForm(onClose));

    pressKey("Escape");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stands down while a floating layer owns Escape", () => {
    const onClose = mock(() => {});
    setFloatingLayerReason("actionsMenu:test", true);
    renderHook(() => useEscapeToCloseForm(onClose));

    pressKey("Escape");

    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes after the floating layer clears", () => {
    const onClose = mock(() => {});
    setFloatingLayerReason("actionsMenu:test", true);
    renderHook(() => useEscapeToCloseForm(onClose));

    pressKey("Escape");
    expect(onClose).not.toHaveBeenCalled();

    setFloatingLayerReason("actionsMenu:test", false);
    pressKey("Escape");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
