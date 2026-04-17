import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockUseUser = mock();
const mockUseAuthModal = mock();

mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: mockUseUser,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: mockUseAuthModal,
}));

const { SubCalendarList } =
  require("./SubCalendarList") as typeof import("./SubCalendarList");

describe("SubCalendarList", () => {
  const openModal = mock();

  beforeEach(() => {
    openModal.mockReset();
    mockUseAuthModal.mockReturnValue({
      closeModal: mock(),
      currentView: "login",
      isOpen: false,
      openModal,
      setView: mock(),
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
