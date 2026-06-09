import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, createContext } from "react";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const SessionContext = createContext<CompassSession>({
  authenticated: false,
  setAuthenticated: mock(),
});

mock.module("@web/auth/compass/session/SessionProvider", () => ({
  SessionContext,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

const { WelcomeModal, STORAGE_KEY } =
  require("./WelcomeModal") as typeof import("./WelcomeModal");

describe("WelcomeModal", () => {
  beforeEach(() => {
    localStorage.clear();
    mockOpenModal.mockClear();
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
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
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
    expect(localStorage.getItem(STORAGE_KEY)).toBe("true");
  });
});
