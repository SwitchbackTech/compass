import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createContext } from "react";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

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

// mock.module is process-wide, not scoped to this file, and isn't reliably
// "restorable" afterward (another file's top-level dynamic import can race
// with this file's afterAll). So the factory spreads the real module's other
// exports (AuthModalContext, useAuthModalState, validateAuthSearch - needed
// by AuthModalProvider/router code elsewhere) and checks a flag on every
// useAuthModal() call instead of freezing the mock in at registration time.
const actualAuthModal = {
  ...(await import("@web/components/AuthModal/hooks/useAuthModal")),
};
let isAuthModalMocked = true;

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  ...actualAuthModal,
  useAuthModal: (...args: unknown[]) =>
    isAuthModalMocked
      ? {
          isOpen: authModalState.isOpen,
          currentView: "login",
          openModal: mockOpenModal,
          closeModal: mockCloseModal,
          setView: mockSetView,
        }
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualAuthModal.useAuthModal(...(args as [])),
}));

afterAll(() => {
  isAuthModalMocked = false;
});

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
        name: "The keyboard-first calendar",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/Rediscover the joy of shortcuts/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /pixel pirate/i })).toBeTruthy();
    expect(screen.getByText("No signup required")).toBeTruthy();
    expect(
      screen.getByRole("link", {
        name: "Compass Calendar - The keyboard-first calendar. Get organized quickly. | Product Hunt",
      }),
    ).toHaveAttribute(
      "href",
      "https://www.producthunt.com/products/compass-calendar?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-compass-calendar-2",
    );
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

  it("does not restore underlay focus when handing off to auth", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <button type="button">Outside calendar</button>,
    );
    const outside = screen.getByRole("button", { name: "Outside calendar" });
    outside.focus();

    rerender(
      <>
        <button type="button">Outside calendar</button>
        <WelcomeModal />
      </>,
    );
    expect(screen.getByRole("button", { name: "Sign up" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Log in" }));
    authModalState.isOpen = true;
    rerender(
      <>
        <button type="button">Outside calendar</button>
        <WelcomeModal />
      </>,
    );

    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeNull();
    expect(outside).not.toHaveFocus();
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
      screen.getByText(/Compass is for busy professionals who live at/),
    ).toBeTruthy();

    await user.click(questionButton);

    expect(questionButton).toHaveAttribute("aria-expanded", "false");
    expect(answer).toHaveAttribute("aria-hidden", "true");
    expect(answer).toHaveAttribute("data-state", "closed");
  });

  it("shows shortcut keycaps on auth and start actions without hover", () => {
    render(<WelcomeModal />);

    for (const [name, key] of [
      ["Sign up", "U"],
      ["Log in", "I"],
      ["Start Now", "S"],
    ] as const) {
      const hint = within(screen.getByRole("button", { name })).getByText(key);
      expect(hint.className).not.toMatch(/opacity-0/);
    }
  });

  it("opens sign up with the U shortcut", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("u");

    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
  });

  it("opens log in with the I shortcut", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("i");

    expect(mockOpenModal).toHaveBeenCalledWith("login");
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
  });

  it("dismisses with the S shortcut", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("s");

    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    render(<WelcomeModal />);
    // Dispatch from inside the modal's onKeyDown scope (not the dialog root
    // itself) so the event bubbles through the handler like a real keypress.
    const signUp = screen.getByRole("button", { name: "Sign up" });

    expect(() => {
      act(() => {
        dispatchMissingKey("keydown", signUp);
      });
    }).not.toThrow();

    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBeNull();
  });

  it("ignores the shortcut keys when a modifier is held", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("{Meta>}u{/Meta}");

    expect(mockOpenModal).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBeNull();
  });

  it("focuses the first control and keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside calendar</button>
        <WelcomeModal />
      </>,
    );

    const signUp = screen.getByRole("button", { name: "Sign up" });
    expect(signUp).toHaveFocus();

    const terms = screen.getByRole("link", { name: "Terms" });
    terms.focus();
    expect(terms).toHaveFocus();

    await user.tab();
    expect(signUp).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Outside calendar" }),
    ).not.toHaveFocus();
  });
});
