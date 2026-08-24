import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createContext } from "react";
import { dispatchMissingKey } from "@web/__tests__/utils/keyboard.test.util";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import {
  registerUseStartGoogleAuthorizationForTests,
  resetUseStartGoogleAuthorizationForTests,
} from "@web/auth/google/authorization/useStartGoogleAuthorization";
import {
  resetGoogleAvailabilityForTests,
  setGoogleAvailabilityForTests,
} from "@web/auth/google/hooks/useIsGoogleAvailable/useIsGoogleAvailable";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
} from "bun:test";

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

const { useShortcutShowcaseStore, initialShortcutShowcaseState } =
  require("@web/components/ShortcutShowcase/showcase.store") as typeof import("@web/components/ShortcutShowcase/showcase.store");

describe("WelcomeModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenModal.mockClear();
    mockCloseModal.mockClear();
    authModalState.isOpen = false;
    window.history.replaceState(null, "", window.location.href);
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  afterEach(() => {
    useShortcutShowcaseStore.setState(initialShortcutShowcaseState);
  });

  it("shows the new copy and the pixel pirate mascot", () => {
    render(<WelcomeModal />);

    expect(
      screen.getByRole("heading", {
        name: "Keyboard calendar",
      }),
    ).toBeTruthy();
    expect(screen.getByText(/No clicks allowed/)).toBeTruthy();
    expect(screen.getByRole("img", { name: /pixel pirate/i })).toBeTruthy();
    expect(screen.getByText("No signup required")).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Product Hunt/i })).toBeNull();
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

  it("shows shortcut keycaps on auth and explore actions without hover", () => {
    render(<WelcomeModal />);

    for (const [name, key] of [
      ["Sign up", "U"],
      ["Log in", "I"],
      ["Explore without an account", "S"],
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

  it("starts the practice after exploring without an account", async () => {
    const user = userEvent.setup();

    render(<WelcomeModal />);

    await user.keyboard("s");

    expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
    await waitFor(() => {
      expect(useShortcutShowcaseStore.getState().isActive).toBe(true);
    });
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER),
    ).toBeNull();
  });

  it("cancels a pending practice start when login opens during dismiss", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<WelcomeModal />);

    await user.keyboard("s");
    await user.keyboard("i");

    expect(mockOpenModal).toHaveBeenCalledWith("login");
    authModalState.isOpen = true;
    rerender(<WelcomeModal />);
    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeNull();

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    });
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);

    authModalState.isOpen = false;
    rerender(<WelcomeModal />);
    expect(
      screen.getByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeVisible();
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("does not start practice if explore is pressed after login before auth opens", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("i");
    expect(mockOpenModal).toHaveBeenCalledWith("login");
    expect(
      screen.queryByRole("dialog", { name: "Welcome to Compass Calendar" }),
    ).toBeNull();

    await user.keyboard("s");
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 500);
      });
    });
    expect(useShortcutShowcaseStore.getState().isActive).toBe(false);
  });

  it("does not mark the practice seen when logging in", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.keyboard("i");

    expect(mockOpenModal).toHaveBeenCalledWith("login");
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER),
    ).toBeNull();
  });

  it("defers the practice offer to after signup", async () => {
    const user = userEvent.setup();
    render(<WelcomeModal />);

    await user.click(screen.getByRole("button", { name: "Sign up" }));

    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(localStorage.getItem(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER)).toBe(
      "true",
    );
    expect(
      localStorage.getItem(STORAGE_KEYS.HAS_SEEN_SHORTCUT_SHOWCASE),
    ).not.toBe("true");
  });

  it("ignores KeyboardEvents with no key instead of throwing", () => {
    render(<WelcomeModal />);
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

  it("focuses the sign up CTA and keeps Tab inside the dialog", async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside calendar</button>
        <WelcomeModal />
      </>,
    );

    // Not the panel's first focusable (Log in): the primary action is signing
    // up, so that is where focus lands.
    const signUp = screen.getByRole("button", { name: "Sign up" });
    expect(signUp).toHaveFocus();

    const terms = screen.getByRole("link", { name: "Terms" });
    terms.focus();
    expect(terms).toHaveFocus();

    await user.tab();
    expect(screen.getByRole("button", { name: "Log in" })).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Outside calendar" }),
    ).not.toHaveFocus();
  });

  describe("with Google available", () => {
    const startGoogleAuthorization = mock();

    beforeEach(() => {
      startGoogleAuthorization.mockClear();
      registerUseStartGoogleAuthorizationForTests(() => ({
        loading: false,
        startGoogleAuthorization,
      }));
      resetGoogleAvailabilityForTests();
      setGoogleAvailabilityForTests("available");
    });

    afterEach(() => {
      // Unmount before restoring the seams. resetGoogleAvailabilityForTests
      // emits synchronously, so a still-mounted modal would re-render against
      // the real hook after the mock had already rendered without one, and
      // React would throw "Should have a queue" on the hook-count change.
      cleanup();
      resetUseStartGoogleAuthorizationForTests();
      resetGoogleAvailabilityForTests();
    });

    it("leads with the Google round trip that also connects the calendar", () => {
      render(<WelcomeModal />);

      expect(
        screen.getByRole("button", { name: "Continue with Google" }),
      ).toBeTruthy();
      expect(
        screen.getByText(/Signs you up and connects your Google Calendar/),
      ).toBeTruthy();
      // Email signup steps aside to a clearly secondary label.
      expect(
        screen.getByRole("button", { name: "Sign up with email" }),
      ).toHaveClass("w-full", "h-10", "c-button-elevated");
    });

    it("starts Google auth from the button and queues the practice offer", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal />);

      await user.click(
        screen.getByRole("button", { name: "Continue with Google" }),
      );

      expect(startGoogleAuthorization).toHaveBeenCalled();
      expect(localStorage.getItem(STORAGE_KEYS.HAS_SEEN_WELCOME)).toBe("true");
      expect(
        localStorage.getItem(STORAGE_KEYS.HAS_PENDING_SHOWCASE_OFFER),
      ).toBe("true");
    });

    it("starts Google auth with the G shortcut", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal />);

      await user.keyboard("g");

      expect(startGoogleAuthorization).toHaveBeenCalled();
    });
  });
});
