import { act } from "react";
import { useNavigate } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderHook } from "@web/__tests__/__mocks__/mock.render";
import {
  mockLinuxUserAgent,
  mockMacOSUserAgent,
  mockWindowsUserAgent,
} from "@web/__tests__/__mocks__/mock.setup";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { sagaMiddleware } from "@web/common/store/middlewares";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
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
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.DAY);
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation(ROOT_ROUTES.DAY));
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should NOT navigate to DAY when 'd' is pressed from DAY date route", () => {
    (useLocation as jest.Mock).mockReturnValue(mockLocation("/day/2024-01-15"));
    renderHook(() => useGlobalShortcuts());
    pressKey("d");
    expect(mockNavigate).not.toHaveBeenCalled();
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
      const store = createTestStore();
      const dispatchSpy = jest.spyOn(store, "dispatch");

      act(() => renderHook(() => useGlobalShortcuts(), { store }));

      await act(async () => {
        await userEvent.keyboard(`{${getModifierKey()}>}{k}`);
      });

      expect(dispatchSpy).toHaveBeenCalledWith(
        settingsSlice.actions.toggleCmdPalette(),
      );

      osSpy.mockRestore();
    },
  );

  it("should close command palette when 'Escape' is pressed", () => {
    const store = createTestStore();
    const dispatchSpy = jest.spyOn(store, "dispatch");

    act(() => renderHook(() => useGlobalShortcuts(), { store }));

    const modifierKey = getModifierKey();
    const isMetaKey = modifierKey === "Meta";
    const modifierProps = isMetaKey ? { metaKey: true } : { ctrlKey: true };

    act(() => {
      fireEvent.keyDown(window, { key: modifierKey, ...modifierProps });
      fireEvent.keyDown(window, { key: "k", ...modifierProps });
    });

    expect(dispatchSpy).toHaveBeenCalledWith(
      settingsSlice.actions.toggleCmdPalette(),
    );

    act(() => pressKey("Escape"));

    expect(dispatchSpy).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });
});
