import { toast } from "react-toastify";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionExpiredToast } from "@web/common/utils/toast/session-expired.toast";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";

jest.mock("@web/components/AuthModal/hooks/useAuthModal");

const mockUseAuthModal = useAuthModal as jest.MockedFunction<
  typeof useAuthModal
>;

describe("SessionExpiredToast", () => {
  const mockOpenModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuthModal.mockReturnValue({
      isOpen: false,
      currentView: "login",
      openModal: mockOpenModal,
      closeModal: jest.fn(),
      setView: jest.fn(),
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
    expect(toast.dismiss).toHaveBeenCalledWith("session-expired-api");
  });
});
