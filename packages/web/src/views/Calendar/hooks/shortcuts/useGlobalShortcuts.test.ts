import { act, createElement } from "react";
import { useNavigate } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import {
  EDIT_MODE_TIMEOUT_MS,
  ShortcutEditModeProvider,
  useShortcutEditMode,
} from "@web/common/context/shortcut-edit-mode";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { viewSlice } from "@web/ducks/events/slices/view.slice";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { reducers } from "@web/store/reducers";
import { sagas } from "@web/store/sagas";
import { useGlobalShortcuts } from "@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts";

// Mock react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

const { useLocation } = jest.requireMock("react-router-dom");

const mockNavigate = jest.fn();
const mockLocation = (pathname: string) => ({ pathname });
const EditModeWrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(ShortcutEditModeProvider, null, children);

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
    jest.clearAllMocks();
    HotkeyManager.resetInstance();
    (useNavigate as jest.Mock).mockReturnValue(mockNavigate);
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/"));
  });

  it("should navigate to NOW when 'n' is pressed from different route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/week"));
    renderHook(() => useGlobalShortcuts());
    pressKey("n");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.NOW);
  });

  it("should NOT navigate to NOW when 'n' is pressed from NOW route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.NOW));
    renderHook(() => useGlobalShortcuts());
    pressKey("n");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should navigate to DAY when 'd' is pressed from different route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/week"));
    renderHook(() => useGlobalShortcuts(), { wrapper: EditModeWrapper });
    pressKey("d");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.DAY));
    renderHook(() => useGlobalShortcuts(), { wrapper: EditModeWrapper });
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY date route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/day/2024-01-15"));
    renderHook(() => useGlobalShortcuts(), { wrapper: EditModeWrapper });
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should NOT navigate to DAY from NOW while edit mode is armed", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.NOW));
    const { result } = renderHook(
      () => {
        useGlobalShortcuts();
        return useShortcutEditMode();
      },
      { wrapper: EditModeWrapper },
    );

    act(() => {
      result.current.armEditMode();
    });

    act(() => {
      pressKey("d");
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should navigate to DAY after edit mode times out on NOW", () => {
    jest.useFakeTimers();
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.NOW));
    const { result } = renderHook(
      () => {
        useGlobalShortcuts();
        return useShortcutEditMode();
      },
      { wrapper: EditModeWrapper },
    );

    act(() => {
      result.current.armEditMode();
    });

    act(() => {
      jest.advanceTimersByTime(EDIT_MODE_TIMEOUT_MS);
    });

    act(() => {
      pressKey("d");
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
    jest.useRealTimers();
  });

  it("should navigate to DAY outside NOW even when edit mode is armed", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.WEEK));
    const { result } = renderHook(
      () => {
        useGlobalShortcuts();
        return useShortcutEditMode();
      },
      { wrapper: EditModeWrapper },
    );

    act(() => {
      result.current.armEditMode();
      pressKey("d");
    });

    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("should navigate to WEEK when 'w' is pressed from different route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/now"));
    renderHook(() => useGlobalShortcuts());
    pressKey("w");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
  });

  it("should NOT navigate to WEEK when 'w' is pressed from WEEK route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.WEEK));
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
    const dispatchSpy = jest.spyOn(store, "dispatch");

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
  ])(
    `should toggle command palette when '$modifier+k' is pressed - $os`,
    async ({ mockFn }) => {
      const osSpy = mockFn();
      HotkeyManager.resetInstance();
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, "dispatch");

      act(() => renderHook(() => useGlobalShortcuts(), { store }));

      act(() => {
        pressModifierShortcut();
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        settingsSlice.actions.toggleCmdPalette(),
      );

      osSpy.mockRestore();
    },
  );

  it("should close command palette when 'Escape' is pressed", () => {
    const osSpy = mockMacOSUserAgent();
    HotkeyManager.resetInstance();
    const store = createTestStore();
    const dispatchSpy = jest.spyOn(store, "dispatch");

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
