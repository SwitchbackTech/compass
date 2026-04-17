import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { act } from "react";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { reducers } from "@web/store/reducers";
import { sagas } from "@web/store/sagas";
import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { afterAll } from "bun:test";

const mockNavigate = mock();
const useLocation = mock();
const mockLocation = (pathname: string) => ({ pathname });
const actualReactRouterDom = await import("react-router-dom");

mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useLocation,
  useNavigate: () => mockNavigate,
}));

const { useGlobalShortcuts } =
  require("@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts") as typeof import("@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts");

const pressModifierShortcut = () => {
  const modifierProps =
    resolveModifier("Mod") === "Meta" ? { metaKey: true } : { ctrlKey: true };

  // Single chord (no separate Meta/Ctrl keydown): TanStack matches Mod from modifier flags on the key event.
  pressKey("k", {
    keyDownInit: modifierProps,
    keyUpInit: modifierProps,
  });
};

const createTestStore = () => {
  const store = configureStore({
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(sagaMiddleware),
  });
  sagaMiddleware.run(sagas);
  return store;
};

describe("useGlobalShortcuts", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useLocation.mockClear();
    useLocation.mockReturnValue(mockLocation("/"));
  });

  it("should navigate to NOW when 'n' is pressed from different route", () => {
    useLocation.mockReturnValue(mockLocation("/week"));
    renderHook(() => useGlobalShortcuts());
    pressKey("n");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
  });

  it("should NOT navigate to NOW when 'n' is pressed from NOW route", () => {
    useLocation.mockReturnValue(mockLocation(ROOT_ROUTES.NOW));
    renderHook(() => useGlobalShortcuts());
    pressKey("n");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should navigate to DAY when 'd' is pressed from different route", () => {
    useLocation.mockReturnValue(mockLocation("/week"));
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY route", () => {
    useLocation.mockReturnValue(mockLocation(ROOT_ROUTES.DAY));
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY date route", () => {
    useLocation.mockReturnValue(mockLocation("/day/2024-01-15"));
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should navigate to WEEK when 'w' is pressed from different route", () => {
    useLocation.mockReturnValue(mockLocation("/now"));
    renderHook(() => useGlobalShortcuts());
    pressKey("w");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
  });

  it("should NOT navigate to WEEK when 'w' is pressed from WEEK route", () => {
    useLocation.mockReturnValue(mockLocation(ROOT_ROUTES.WEEK));
    renderHook(() => useGlobalShortcuts());
    pressKey("w");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should navigate to LOGOUT when 'z' is pressed", () => {
    renderHook(() => useGlobalShortcuts());
    pressKey("z");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.LOGOUT);
  });

  it("should open reminder when 'r' is pressed", () => {
    const store = createTestStore();
    // Spy on dispatch
    const dispatchSpy = spyOn(store, "dispatch");

    renderHook(() => useGlobalShortcuts(), { store });

    pressKey("r");

    expect(dispatchSpy).toHaveBeenCalledWith(
      viewSlice.actions.updateReminder(true),
    );
  });

  it.each([
    { os: "Windows", mockFn: mockWindowsUserAgent, modifier: "Control" },
    { os: "Linux", mockFn: mockLinuxUserAgent, modifier: "Control" },
    { os: "MacOS", mockFn: mockMacOSUserAgent, modifier: "Meta" },
  ])(`should toggle command palette when '$modifier+k' is pressed - $os`, async ({
    mockFn,
  }) => {
    const osSpy = mockFn();
    HotkeyManager.resetInstance();
    const store = createTestStore();
    const dispatchSpy = spyOn(store, "dispatch");

    act(() => renderHook(() => useGlobalShortcuts(), { store }));

    act(() => {
      pressModifierShortcut();
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      settingsSlice.actions.toggleCmdPalette(),
    );

    osSpy.mockRestore();
  });

  it("should close command palette when 'Escape' is pressed", () => {
    const osSpy = mockMacOSUserAgent();
    HotkeyManager.resetInstance();
    const store = createTestStore();
    const dispatchSpy = spyOn(store, "dispatch");

    act(() => renderHook(() => useGlobalShortcuts(), { store }));

    return act(async () => {
      pressModifierShortcut();

      expect(dispatchSpy).toHaveBeenCalledWith(
        settingsSlice.actions.toggleCmdPalette(),
      );

      pressKey("Escape");

      expect(dispatchSpy).toHaveBeenCalledWith(
        settingsSlice.actions.closeCmdPalette(),
      );

      osSpy.mockRestore();
    });
  });
});

afterAll(() => {
  mock.restore();
});
