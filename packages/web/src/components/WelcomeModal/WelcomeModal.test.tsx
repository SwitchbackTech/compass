import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createContext } from "react";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const mockCloseModal = mock();
const mockSetView = mock();
const authModalState = { isOpen: false };
const SessionContext = createContext<CompassSession>({
  authenticated: false,
  setAuthenticated: mock(),
});

mock.module("@web/auth/compass/session/session.context", () => ({
  SessionContext,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    isOpen: authModalState.isOpen,
    currentView: "login",
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
    setView: mockSetView,
  }),
}));

const { WelcomeModal } =
  require("./WelcomeModal") as typeof import("./WelcomeModal");
const { STORAGE_KEYS } =
  require("@web/common/constants/storage.constants") as typeof import("@web/common/constants/storage.constants");

describe("WelcomeModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenModal.mockClear();
    mockCloseModal.mockClear();
    authModalState.isOpen = false;
    window.history.replaceState(null, "", window.location.href);
  });

  it("shows the new copy and the pixel pirate mascot", () => {
    render(<WelcomeModal />);

    expect(
      screen.getByRole("heading", {
        name: "Compass Calendar helps you manage your time, simply.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /A small, but mighty calendar\/todo app\. Built for busy minimalists/,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: /pixel pirate/i })).toBeTruthy();
    expect(screen.getByText("No signup required")).toBeTruthy();
  });

  it("opens the auth modal from the Log in pill", async () => {
    const user = userEvent.setup();

    const { rerender } = render(<WelcomeModal />);

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(mockOpenModal).toHaveBeenCalledWith("login");
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");

    // The welcome screen hides while the auth modal is open
    authModalState.isOpen = true;
    rerender(<WelcomeModal />);
    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeNull();
  });

  it("reappears when the auth modal closes (e.g. via the browser back button)", async () => {
    const user = userEvent.setup();

    const { rerender } = render(<WelcomeModal />);

    await user.click(screen.getByRole("button", { name: "Log in" }));
    authModalState.isOpen = true;
    rerender(<WelcomeModal />);
    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeNull();

    // Back press pops the ?auth= entry, which closes the auth modal
    authModalState.isOpen = false;
    rerender(<WelcomeModal />);
    expect(
      screen.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeTruthy();
  });

  it("expands and collapses FAQ answers", async () => {
    const user = userEvent.setup();

    render(<WelcomeModal />);

    const questionButton = screen.getByRole("button", {
      name: "Who is Compass for?",
    });
    const answerId = questionButton.getAttribute("aria-controls");
    expect(answerId).toBeTruthy();

    const answer = document.getElementById(answerId as string);
    expect(questionButton).toHaveAttribute("aria-expanded", "false");
    expect(answer).toHaveAttribute("aria-hidden", "true");
    expect(answer).toHaveAttribute("data-state", "closed");

    await user.click(questionButton);

    expect(questionButton).toHaveAttribute("aria-expanded", "true");
    expect(answer).toHaveAttribute("aria-hidden", "false");
    expect(answer).toHaveAttribute("data-state", "open");
    expect(
      screen.getByText(
        /Compass is designed for minimalists who value efficiency/,
      ),
    ).toBeTruthy();

    await user.click(questionButton);

    expect(questionButton).toHaveAttribute("aria-expanded", "false");
    expect(answer).toHaveAttribute("aria-hidden", "true");
    expect(answer).toHaveAttribute("data-state", "closed");
  });
});
