import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockDismiss = mock();
const mockOpenModal = mock();
const mockUseAuthModal = mock();
const mockUseAuthModalState = mock();

mock.module("react-toastify", () => ({
  toast: {
    dismiss: mockDismiss,
  },
}));
mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  AuthModalContext: require("react").createContext({
    closeModal: mock(),
    currentView: "login",
    isOpen: false,
    openModal: mock(),
    setView: mock(),
  }),
  useAuthModal: mockUseAuthModal,
  useAuthModalState: mockUseAuthModalState,
}));

const { SessionExpiredToast } =
  require("@web/common/utils/toast/session-expired.toast") as typeof import("@web/common/utils/toast/session-expired.toast");

describe("SessionExpiredToast", () => {
  beforeEach(() => {
    mockDismiss.mockClear();
    mockOpenModal.mockClear();
    mockUseAuthModal.mockClear();
    mockUseAuthModal.mockReturnValue({
      isOpen: false,
      currentView: "login",
      openModal: mockOpenModal,
      closeModal: mock(),
      setView: mock(),
    });
  });

  it("renders session-expired message and sign-in button", () => {
    render(<SessionExpiredToast toastId="session-expired-api" />);

    expect(mockUseAuthModal).toHaveBeenCalledWith();
    expect(
      screen.getByText("Session expired. Please sign in again."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("opens the auth modal and dismisses toast when button is clicked", async () => {
    const user = userEvent.setup();

    render(<SessionExpiredToast toastId="session-expired-api" />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(mockOpenModal).toHaveBeenCalledWith("login");
    expect(mockDismiss).toHaveBeenCalledWith("session-expired-api");
  });
});
