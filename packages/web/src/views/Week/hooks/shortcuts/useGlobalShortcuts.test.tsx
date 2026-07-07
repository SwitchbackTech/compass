import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  selectIsSidebarOpen,
  useViewStore,
} from "@web/events/stores/view.store";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const logout = mock();
const mockOpenModal = mock();
const mockOpenLogoutConfirmation = mock();
const mockUseAuthModal = mock();
const mockUseLogoutConfirmation = mock();
const mockUseSession = mock();
const mockNavigate = mock();
const mockPathname = { value: "/week" };

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: mockUseAuthModal,
}));

mock.module(
  "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation",
  () => ({
    useLogoutConfirmation: mockUseLogoutConfirmation,
  }),
);

// react-router-dom's useNavigate/useLocation are mocked directly (rather than
// relying on a real MemoryRouter) because Bun's `mock.module` is process-wide:
// another test file mocking "react-router-dom" can otherwise silently replace
// `useNavigate` for every file that runs afterward in the same test run.
const actualReactRouterDom = await import("react-router-dom");

mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname.value }),
}));

const { useGlobalShortcuts } = await import("./useGlobalShortcuts");

function wrapper({ children }: PropsWithChildren) {
  return <HotkeysProvider>{children}</HotkeysProvider>;
}

describe("useGlobalShortcuts", () => {
  beforeEach(() => {
    HotkeyManager.resetInstance();
    logout.mockReset();
    mockOpenModal.mockClear();
    mockOpenLogoutConfirmation.mockClear();
    mockUseAuthModal.mockReset();
    mockUseLogoutConfirmation.mockReset();
    mockUseSession.mockReset();
    mockNavigate.mockClear();
    mockUseAuthModal.mockReturnValue({ openModal: mockOpenModal });
    mockUseLogoutConfirmation.mockReturnValue({
      openLogoutConfirmation: mockOpenLogoutConfirmation,
    });
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });
    mockPathname.value = "/week";
  });

  it("opens logout confirmation when authenticated users press Z", async () => {
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      pressKey("z");
    });

    await waitFor(() => {
      expect(mockOpenLogoutConfirmation).toHaveBeenCalledTimes(1);
    });
    expect(mockOpenModal).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });
  });

  it("opens login when logged-out users press Z", async () => {
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      pressKey("z");
    });

    await waitFor(() => {
      expect(mockOpenModal).toHaveBeenCalledWith("login");
    });
    expect(mockOpenLogoutConfirmation).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });
  });

  it("does not navigate to Day view when a held-Cmd D keyup is replayed after a Mod+D press", async () => {
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    // Mod+D pressed (e.g. Event Form duplicate shortcut). The test platform
    // resolves "Mod" to Control, so use ctrlKey here to match. Dispatched
    // directly (rather than via the paired `pressKey` helper) so the
    // modifier-swallowed keyup below isn't preceded by an extra, unwanted
    // unmodified keyup.
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          bubbles: true,
          cancelable: true,
          key: "d",
          ctrlKey: true,
        }),
      );
    });

    // macOS swallows the "d" keyup while the modifier is held, then replays
    // it once the modifier is released — by then the modifier flag is
    // already false, matching the bare "D" Day-view shortcut unless
    // explicitly suppressed.
    act(() => {
      document.dispatchEvent(
        new KeyboardEvent("keyup", {
          bubbles: true,
          cancelable: true,
          key: "d",
          ctrlKey: false,
        }),
      );
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });
  });

  it("toggles and persists the sidebar when pressing [", async () => {
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    expect(selectIsSidebarOpen(useViewStore.getState())).toBe(true);

    act(() => {
      pressKey("[");
    });

    await waitFor(() => {
      expect(selectIsSidebarOpen(useViewStore.getState())).toBe(false);
    });
    expect(localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN)).toBe("false");

    act(() => {
      pressKey("[");
    });

    await waitFor(() => {
      expect(selectIsSidebarOpen(useViewStore.getState())).toBe(true);
    });
    expect(localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN)).toBe("true");

    act(() => {
      unmount();
    });
  });

  it("still navigates to Day view for a plain D press", async () => {
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      pressKey("d");
    });

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/day");
    });

    act(() => {
      unmount();
    });
  });
});
