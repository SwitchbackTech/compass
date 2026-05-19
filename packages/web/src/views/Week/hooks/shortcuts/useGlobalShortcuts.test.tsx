import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { MemoryRouter } from "react-router-dom";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const dispatch = mock();
const logout = mock();
const mockOpenModal = mock();
const mockUseAuthModal = mock();
const mockUseLogout = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/hooks/useLogout", () => ({
  useLogout: mockUseLogout,
}));

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: mockUseAuthModal,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => dispatch,
}));

const { useGlobalShortcuts } = await import("./useGlobalShortcuts");

function wrapper({ children }: PropsWithChildren) {
  return (
    <HotkeysProvider>
      <MemoryRouter
        initialEntries={["/week"]}
        future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
      >
        {children}
      </MemoryRouter>
    </HotkeysProvider>
  );
}

describe("useGlobalShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    dispatch.mockClear();
    logout.mockClear();
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
