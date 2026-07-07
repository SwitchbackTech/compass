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

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();

    render(<WelcomeModal />);

    expect(
      screen.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeTruthy();

    await user.click(screen.getByRole("presentation"));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
      ).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
  });

  it("closes when Escape is pressed", async () => {
    const user = userEvent.setup();

    render(<WelcomeModal />);

    const backdrop = screen.getByRole("presentation");
    await act(async () => {
      backdrop.focus();
    });

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
      ).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
  });

  it("shows the new copy and the pixel pirate mascot", () => {
    render(<WelcomeModal />);

    expect(
      screen.getByRole("heading", {
        name: "Compass Calendar is a simple app that helps you manage your time.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /Minimal, yet fast and intuitive\. We cut out all the noise/,
      ),
    ).toBeTruthy();
    expect(screen.getByRole("img", { name: /pixel pirate/i })).toBeTruthy();
    expect(screen.getByText("No signup required")).toBeTruthy();
  });

  it("dismisses when Start Now is clicked", async () => {
    const user = userEvent.setup();

    render(<WelcomeModal />);

    await user.click(screen.getByRole("button", { name: "Start Now" }));

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
      ).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it("opens the auth modal and pushes a history entry from the Log in pill", async () => {
    const user = userEvent.setup();
    const pushStateSpy = mock();
    const originalPushState = window.history.pushState.bind(window.history);
    window.history.pushState = (...args) => {
      pushStateSpy(...args);
      originalPushState(...args);
    };

    try {
      render(<WelcomeModal />);

      await user.click(screen.getByRole("button", { name: "Log in" }));

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", {
            name: "Welcome to Compass Calendar",
          }),
        ).toBeNull();
      });
      expect(mockOpenModal).toHaveBeenCalledWith("login");
      expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
      expect(pushStateSpy).toHaveBeenCalledWith(
        { compassAuthFromWelcome: true },
        "",
        window.location.href,
      );
    } finally {
      window.history.pushState = originalPushState;
    }
  });

  it("returns to the welcome screen when the browser back button is pressed on the login form", async () => {
    const user = userEvent.setup();

    const { rerender } = render(<WelcomeModal />);

    await user.click(screen.getByRole("button", { name: "Log in" }));
    expect(mockOpenModal).toHaveBeenCalledWith("login");

    // Simulate the auth modal now being open
    authModalState.isOpen = true;
    rerender(<WelcomeModal />);

    // Simulate the browser back button
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });

    expect(mockCloseModal).toHaveBeenCalledTimes(1);
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
