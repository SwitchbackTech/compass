import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { pressKey } from "@web/__tests__/utils/keyboard.test.util";
import { useSidebarShortcuts } from "./useSidebarShortcuts";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function wrapper({ children }: PropsWithChildren) {
  return <HotkeysProvider>{children}</HotkeysProvider>;
}

describe("useSidebarShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
  });

  it("opens the sidebar before opening shortcuts with ?", async () => {
    const onToggleSidebar = mock();

    const { result } = renderHook(
      () =>
        useSidebarShortcuts({
          isSidebarOpen: false,
          onToggleSidebar,
        }),
      { wrapper },
    );

    act(() => {
      pressKey("?", {
        keyDownInit: { shiftKey: true },
        keyUpInit: { shiftKey: true },
      });
    });

    await waitFor(() => {
      expect(onToggleSidebar).toHaveBeenCalledTimes(1);
      expect(result.current.isShortcutsOpen).toBe(true);
    });
  });

  it("toggles shortcuts closed with ? when they are already open", async () => {
    const onToggleSidebar = mock();

    const { result } = renderHook(
      () =>
        useSidebarShortcuts({
          isSidebarOpen: true,
          onToggleSidebar,
        }),
      { wrapper },
    );

    act(() => {
      pressKey("?", {
        keyDownInit: { shiftKey: true },
        keyUpInit: { shiftKey: true },
      });
    });

    await waitFor(() => {
      expect(result.current.isShortcutsOpen).toBe(true);
    });

    act(() => {
      pressKey("?", {
        keyDownInit: { shiftKey: true },
        keyUpInit: { shiftKey: true },
      });
    });

    await waitFor(() => {
      expect(result.current.isShortcutsOpen).toBe(false);
      expect(onToggleSidebar).not.toHaveBeenCalled();
    });
  });

  it("opens shortcuts from the shifted slash key event", async () => {
    const onToggleSidebar = mock();

    const { result } = renderHook(
      () =>
        useSidebarShortcuts({
          isSidebarOpen: true,
          onToggleSidebar,
        }),
      { wrapper },
    );

    act(() => {
      pressKey("/", {
        keyDownInit: { shiftKey: true },
        keyUpInit: { shiftKey: true },
      });
    });

    await waitFor(() => {
      expect(result.current.isShortcutsOpen).toBe(true);
      expect(onToggleSidebar).not.toHaveBeenCalled();
    });
  });

  it("closes shortcuts when the sidebar closes", async () => {
    const onToggleSidebar = mock();

    const { rerender, result } = renderHook(
      ({ isSidebarOpen }) =>
        useSidebarShortcuts({
          isSidebarOpen,
          onToggleSidebar,
        }),
      {
        initialProps: { isSidebarOpen: true },
        wrapper,
      },
    );

    act(() => {
      result.current.toggleShortcuts();
    });

    await waitFor(() => {
      expect(result.current.isShortcutsOpen).toBe(true);
    });

    rerender({ isSidebarOpen: false });

    await waitFor(() => {
      expect(result.current.isShortcutsOpen).toBe(false);
    });
  });

  it("does not toggle shortcuts with ]", async () => {
    const onToggleSidebar = mock();

    const { result } = renderHook(
      () =>
        useSidebarShortcuts({
          isSidebarOpen: true,
          onToggleSidebar,
        }),
      { wrapper },
    );

    act(() => {
      pressKey("]");
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.current.isShortcutsOpen).toBe(false);
    expect(onToggleSidebar).not.toHaveBeenCalled();
  });
});
