import "@testing-library/jest-dom";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as exportUtil from "@web/common/storage/offline-data/export-user-data.util";
import { AuthModalContext } from "@web/components/AuthModal/hooks/useAuthModal";
import { TrialGateModal } from "./TrialGateModal";
import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";

const mockOpenModal = mock();

const renderGate = () =>
  render(
    <AuthModalContext.Provider
      value={{
        isOpen: false,
        currentView: "login",
        openModal: mockOpenModal,
        closeModal: mock(),
        setView: mock(),
      }}
    >
      <TrialGateModal />
    </AuthModalContext.Provider>,
  );

describe("TrialGateModal", () => {
  afterEach(() => {
    mockOpenModal.mockClear();
  });

  it("shows shortcut keycaps and focuses Sign up", () => {
    renderGate();

    expect(
      screen.getByRole("button", { name: "Sign up to continue" }),
    ).toHaveFocus();
    for (const [name, key] of [
      ["Sign up to continue", "U"],
      ["Log in", "I"],
      ["Export my data", "E"],
    ] as const) {
      expect(
        within(screen.getByRole("button", { name })).getByText(key),
      ).toBeTruthy();
    }
  });

  it("opens sign up with U and log in with I", async () => {
    const user = userEvent.setup();
    renderGate();

    await user.keyboard("u");
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");

    mockOpenModal.mockClear();
    await user.keyboard("i");
    expect(mockOpenModal).toHaveBeenCalledWith("login");
  });

  it("exports with E and does not dismiss on Escape", async () => {
    const exportSpy = spyOn(exportUtil, "runExportMyData").mockResolvedValue();
    const user = userEvent.setup();
    renderGate();

    await user.keyboard("{Escape}");
    expect(
      screen.getByRole("dialog", { name: "Your free trial has ended" }),
    ).toBeInTheDocument();

    await user.keyboard("e");
    await waitFor(() => {
      expect(exportSpy).toHaveBeenCalled();
    });
    exportSpy.mockRestore();
  });

  it("traps Tab within the dialog", async () => {
    const user = userEvent.setup();
    renderGate();

    const signUp = screen.getByRole("button", { name: "Sign up to continue" });
    const exportData = screen.getByRole("button", { name: "Export my data" });
    expect(signUp).toHaveFocus();

    await user.tab({ shift: true });
    expect(exportData).toHaveFocus();

    await user.tab();
    expect(signUp).toHaveFocus();
  });
});
