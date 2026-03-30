import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUser } from "@web/auth/hooks/user/useUser";
import { useAuthModal } from "@web/components/AuthModal/hooks/useAuthModal";
import { SubCalendarList } from "./SubCalendarList";

jest.mock("@web/auth/hooks/user/useUser", () => ({
  useUser: jest.fn(),
}));

jest.mock("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: jest.fn(),
}));

const mockUseUser = useUser as jest.MockedFunction<typeof useUser>;
const mockUseAuthModal = useAuthModal as jest.MockedFunction<
  typeof useAuthModal
>;

describe("SubCalendarList", () => {
  const openModal = jest.fn();

  beforeEach(() => {
    openModal.mockReset();
    mockUseAuthModal.mockReturnValue({
      closeModal: jest.fn(),
      currentView: "login",
      isOpen: false,
      openModal,
      setView: jest.fn(),
    });
  });

  it("renders the signed in email without the temporary account tooltip", () => {
    mockUseUser.mockReturnValue({
      email: "signed-in@example.com",
    });

    render(<SubCalendarList />);

    expect(screen.getByText("signed-in@example.com")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /temporary account info/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Sign up to save your changes"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("primary")).toBeInTheDocument();
  });

  it("renders temporary account with a hover tooltip when there is no email", async () => {
    const user = userEvent.setup();

    mockUseUser.mockReturnValue({
      email: undefined,
    });

    render(<SubCalendarList />);

    const infoButton = screen.getByRole("button", {
      name: /temporary account info/i,
    });

    expect(screen.getByText("Temporary account")).toBeInTheDocument();
    expect(screen.queryByText("primary")).not.toBeInTheDocument();

    await user.hover(infoButton);

    await waitFor(() => {
      expect(
        screen.getByText("Sign up to save your changes"),
      ).toBeInTheDocument();
    });
  });

  it("opens the sign up auth modal when the temporary account icon is clicked", async () => {
    const user = userEvent.setup();

    mockUseUser.mockReturnValue({
      email: undefined,
    });

    render(<SubCalendarList />);

    await user.click(
      screen.getByRole("button", {
        name: /temporary account info/i,
      }),
    );

    expect(openModal).toHaveBeenCalledWith("signUp");
  });
});
