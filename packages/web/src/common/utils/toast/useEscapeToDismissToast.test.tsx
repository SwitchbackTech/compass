import { HotkeyManager } from "@tanstack/react-hotkeys";
import { renderHook } from "@testing-library/react";
import { createTestToastPort } from "@web/__tests__/helpers/web-test-seams";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import {
  ID_CONTEXT_MENU_ITEMS,
  ID_EVENT_FORM,
} from "@web/common/constants/web.constants";
import {
  registerToastPort,
  resetToastPort,
} from "@web/common/utils/toast/toast.port";
import { useEscapeToDismissToast } from "@web/common/utils/toast/useEscapeToDismissToast";
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";

describe("useEscapeToDismissToast", () => {
  let mocks: ReturnType<typeof createTestToastPort>["mocks"];

  beforeEach(() => {
    HotkeyManager.resetInstance();
    document.body.removeAttribute("data-app-locked");

    const testPort = createTestToastPort();
    mocks = testPort.mocks;
    registerToastPort(testPort.port);
  });

  afterEach(() => {
    resetToastPort();
    document.body.innerHTML = "";
  });

  it("dismisses the visible toast on Escape", () => {
    renderHook(() => useEscapeToDismissToast());

    pressKey("Escape");

    expect(mocks.dismiss).toHaveBeenCalledTimes(1);
    expect(mocks.dismiss).toHaveBeenCalledWith();
  });

  it("does not dismiss while a context menu is open", () => {
    const contextMenu = document.createElement("div");
    contextMenu.id = ID_CONTEXT_MENU_ITEMS;
    document.body.appendChild(contextMenu);

    renderHook(() => useEscapeToDismissToast());
    pressKey("Escape");

    expect(mocks.dismiss).not.toHaveBeenCalled();
  });

  it("does not dismiss while the event form is open", () => {
    const form = document.createElement("form");
    form.setAttribute("name", ID_EVENT_FORM);
    document.body.appendChild(form);

    renderHook(() => useEscapeToDismissToast());
    pressKey("Escape");

    expect(mocks.dismiss).not.toHaveBeenCalled();
  });

  it("does not dismiss while a floating layer (dialog) is open", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    document.body.appendChild(dialog);
    // jsdom has no layout engine, so a plain element always reports zero
    // client rects; stub it to look on-screen, matching a real dialog.
    const rectsSpy = spyOn(dialog, "getClientRects").mockReturnValue([
      {} as DOMRect,
    ] as unknown as DOMRectList);

    renderHook(() => useEscapeToDismissToast());
    pressKey("Escape");

    expect(mocks.dismiss).not.toHaveBeenCalled();
    rectsSpy.mockRestore();
  });

  it("does not dismiss while the app is locked (a modal is open)", () => {
    document.body.dataset.appLocked = "true";

    renderHook(() => useEscapeToDismissToast());
    pressKey("Escape");

    expect(mocks.dismiss).not.toHaveBeenCalled();
  });
});
