import { HotkeyManager, HotkeysProvider } from "@tanstack/react-hotkeys";
import { act, renderHook, waitFor } from "@testing-library/react";
import { type PropsWithChildren } from "react";
import { STORAGE_KEYS } from "@web/common/constants/storage.constants";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import {
  selectIsSidebarOpen,
  useViewStore,
} from "@web/events/stores/view.store";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const logout = mock();
const mockOpenModal = mock();
const mockOpenLogoutConfirmation = mock();
const mockUseAuthModal = mock();
const mockUseLogoutConfirmation = mock();
const mockUseSession = mock();
const mockNavigate = mock();
const mockPathname = { value: "/week" };

// mock.module is process-wide, not scoped to this file, and isn't reliably
// "restorable" afterward (another file's top-level dynamic import can race
// with this file's afterAll). So useAuthModal/useNavigate/useLocation below
// are wrapped to check a flag on every call instead of freezing the mock in
// at registration time - once the flag flips off (afterAll), callers
// anywhere in the process fall through to the real implementation. The
// modules are snapshotted into plain objects (not just held as namespace
// references) because mock.module mutates the live module object in place.
const actualAuthModal = {
  ...(await import("@web/components/AuthModal/hooks/useAuthModal")),
};
const actualTanstackRouter = { ...(await import("@tanstack/react-router")) };
let isAuthModalMocked = true;
let isRouterMocked = true;

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  ...actualAuthModal,
  useAuthModal: (...args: unknown[]) =>
    isAuthModalMocked
      ? mockUseAuthModal(...args)
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualAuthModal.useAuthModal(...(args as [])),
}));

mock.module(
  "@web/components/LogoutConfirmation/hooks/useLogoutConfirmation",
  () => ({
    useLogoutConfirmation: mockUseLogoutConfirmation,
  }),
);

mock.module("@tanstack/react-router", () => ({
  ...actualTanstackRouter,
  useNavigate: (...args: unknown[]) =>
    isRouterMocked
      ? mockNavigate
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualTanstackRouter.useNavigate(...(args as [])),
  useLocation: (...args: unknown[]) =>
    isRouterMocked
      ? { pathname: mockPathname.value }
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualTanstackRouter.useLocation(...(args as [])),
}));

const { useGlobalShortcuts } = await import("./useGlobalShortcuts");

afterAll(() => {
  isAuthModalMocked = false;
  isRouterMocked = false;
});

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
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/day" });
    });

    act(() => {
      unmount();
    });
  });

  it("does not navigate when pressing W while already on a dated week route", () => {
    mockPathname.value = "/week/2026-05-20";
    const { unmount } = renderHook(() => useGlobalShortcuts(), { wrapper });

    act(() => {
      pressKey("w");
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    act(() => {
      unmount();
    });
  });
});
