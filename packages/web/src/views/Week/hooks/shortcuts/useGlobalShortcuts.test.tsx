import { configureStore } from "@reduxjs/toolkit";
import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { createInitialState } from "@web/__tests__/utils/state/store.test.util";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { reducers } from "@web/store/reducers";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const logout = mock();
const mockOpenModal = mock();
const mockUseAuthModal = mock();
const mockUseLogout = mock();
const mockUseSession = mock();

const createStore = () =>
  configureStore({
    preloadedState: createInitialState(),
    reducer: reducers,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
        thunk: false,
      }),
  });

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/auth/compass/hooks/useLogout", () => ({
  useLogout: mockUseLogout,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: mockUseAuthModal,
}));

const { useGlobalShortcuts } = await import("./useGlobalShortcuts");

function wrapper({ children }: PropsWithChildren) {
  const store = createStore();

  return (
    <HotkeysProvider>
      <Provider store={store}>
        <MemoryRouter
          initialEntries={["/week"]}
          future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
        >
          {children}
        </MemoryRouter>
      </Provider>
    </HotkeysProvider>
  );
}

describe("useGlobalShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    logout.mockReset();
    mockOpenModal.mockClear();
    mockUseAuthModal.mockReset();
    mockUseLogout.mockReset();
    mockUseSession.mockReset();
    mockUseAuthModal.mockReturnValue({ openModal: mockOpenModal });
    mockUseLogout.mockReturnValue(logout);
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
  });

  it("logs out directly when authenticated users press Z", async () => {
    renderHook(() => useGlobalShortcuts(), { wrapper });

    pressKey("z");

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1);
    });
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it("opens login when logged-out users press Z", async () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    renderHook(() => useGlobalShortcuts(), { wrapper });

    pressKey("z");

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });
    expect(logout).not.toHaveBeenCalled();
  });
});
