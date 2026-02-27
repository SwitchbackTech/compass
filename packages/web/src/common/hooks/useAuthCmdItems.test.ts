import type { MouseEvent } from "react";
import { act } from "react";
import { renderHook } from "@testing-library/react";
import { useSession } from "@web/auth/hooks/session/useSession";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { useAuthCmdItems } from "./useAuthCmdItems";

jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: jest.fn(),
}));

describe("useAuthCmdItems", () => {
  const mockOpenModal = jest.fn();
  const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
  const mockUseAuthModal = useAuthModal as jest.MockedFunction<
    typeof useAuthModal
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "", "/day");

    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
    });
    mockUseAuthModal.mockReturnValue({
      isOpen: false,
      currentView: "login",
      openModal: mockOpenModal,
      closeModal: jest.fn(),
      setView: jest.fn(),
    });
  });

  it("returns no items when authenticated", () => {
    window.history.pushState({}, "", "/day?auth=true");
    mockUseSession.mockReturnValue({
      authenticated: true,
      setAuthenticated: jest.fn(),
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

    const { result } = renderHook(() => useAuthCmdItems());

    expect(result.current.map((item) => item.id)).toEqual([
      "sign-up",
      "log-in",
    ]);
  });

  it("opens matching auth modal view when item actions are clicked", () => {
    window.history.pushState({}, "", "/day?auth=true");

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
