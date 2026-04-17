import { renderHook } from "@testing-library/react";
import { act, type MouseEvent } from "react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const mockUseAuthModal = mock();
const mockUseAuthFeatureFlag = mock();
const mockUseSession = mock();

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: mockUseSession,
}));
mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: mockUseAuthModal,
}));
mock.module("@web/components/AuthModal/hooks/useAuthFeatureFlag", () => ({
  useAuthFeatureFlag: mockUseAuthFeatureFlag,
}));

const { useAuthCmdItems } =
  require("./useAuthCmdItems") as typeof import("./useAuthCmdItems");

describe("useAuthCmdItems", () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
    mockUseAuthModal.mockClear();
    mockUseAuthFeatureFlag.mockClear();
    mockUseSession.mockClear();
    window.history.pushState({}, "", "/day");

    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    mockUseAuthModal.mockReturnValue({
      isOpen: false,
      currentView: "login",
      openModal: mockOpenModal,
      closeModal: mock(),
      setView: mock(),
    });
    mockUseAuthFeatureFlag.mockReturnValue(false);
  });

  it("returns no items when authenticated", () => {
    window.history.pushState({}, "", "/day?auth=true");
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: mock(),
    });

    const { result } = renderHook(() => useAuthCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns no items when auth feature flag is disabled", () => {
    const { result } = renderHook(() => useAuthCmdItems());

    expect(result.current).toEqual([]);
  });

  it("returns auth items when unauthenticated and auth feature flag is enabled", () => {
    window.history.pushState({}, "", "/day?auth=true");
    mockUseAuthFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useAuthCmdItems());

    expect(result.current.map((item) => item.id)).toEqual([
      "sign-up",
      "log-in",
    ]);
  });

  it("opens matching auth modal view when item actions are clicked", () => {
    window.history.pushState({}, "", "/day?auth=true");
    mockUseAuthFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useAuthCmdItems());
    const signUpItem = result.current.find((item) => item.id === "sign-up");
    const logInItem = result.current.find((item) => item.id === "log-in");

    const mockEvent = {} as MouseEvent<HTMLButtonElement>;
    act(() => {
      signUpItem?.onClick?.(mockEvent);
      logInItem?.onClick?.(mockEvent);
    });

    expect(mockOpenModal).toHaveBeenNthCalledWith(1, "signUp");
    expect(mockOpenModal).toHaveBeenNthCalledWith(2, "login");
  });
});
