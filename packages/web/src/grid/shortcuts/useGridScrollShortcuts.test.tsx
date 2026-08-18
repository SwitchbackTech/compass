import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { ID_GRID_MAIN } from "@web/common/constants/web.constants";
import { useGridScrollShortcuts } from "@web/grid/shortcuts/useGridScrollShortcuts";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const wrapper = ({ children }: PropsWithChildren) => (
  <HotkeysProvider>{children}</HotkeysProvider>
);

describe("useGridScrollShortcuts", () => {
  let scrollBy: ReturnType<typeof mock>;

  beforeEach(() => {
    HotkeyManager.resetInstance();
    const grid = document.createElement("section");
    grid.id = ID_GRID_MAIN;
    Object.defineProperty(grid, "clientHeight", { value: 500 });
    scrollBy = mock();
    grid.scrollBy = scrollBy as typeof grid.scrollBy;
    document.body.append(grid);
  });

  afterEach(() => {
    cleanup();
    document.getElementById(ID_GRID_MAIN)?.remove();
    document.body.innerHTML = "";
  });

  it("pages the grid with PageDown and PageUp from document focus", async () => {
    renderHook(() => useGridScrollShortcuts(), { wrapper });

    pressKey("PageDown");
    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ top: 500 });
    });

    pressKey("PageUp");
    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ top: -500 });
    });
  });

  it("pages the grid when an event-like control is focused", async () => {
    const button = document.createElement("button");
    button.textContent = "Standup";
    document.body.append(button);
    button.focus();

    renderHook(() => useGridScrollShortcuts(), { wrapper });
    pressKey("PageDown", {}, button);

    await waitFor(() => {
      expect(scrollBy).toHaveBeenCalledWith({ top: 500 });
    });
  });

  it("does not scroll while typing in an input", async () => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();

    renderHook(() => useGridScrollShortcuts(), { wrapper });
    pressKey("PageDown", {}, input);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
