import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
let mockEmail: string | undefined;
let mockGoogleState: GoogleUiState = "NOT_CONNECTED";
const mockUseConnectGoogle = mock(() => ({
  state: mockGoogleState,
}));

mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: () => ({
    email: mockEmail,
  }),
}));

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: mockUseConnectGoogle,
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

mock.module("@phosphor-icons/react", () => ({
  InfoIcon: () => <span aria-hidden="true">info</span>,
  PlusIcon: () => <span aria-hidden="true">plus</span>,
}));

const { PlannerAccountSummary } =
  require("./PlannerAccountSummary") as typeof import("./PlannerAccountSummary");

describe("PlannerAccountSummary", () => {
  beforeEach(() => {
    mockEmail = undefined;
    mockGoogleState = "NOT_CONNECTED";
    mockOpenModal.mockClear();
    mockUseConnectGoogle.mockClear();
  });

  it("shows a sign up prompt for temporary accounts", async () => {
    const user = userEvent.setup();

    render(<PlannerAccountSummary />);

    await user.click(
      screen.getByRole("button", {
        name: "Temporary account. Sign up to save changes",
      }),
    );

    expect(screen.getByText("Temporary account")).toBeTruthy();
    expect(screen.getByText("Sign up")).toBeTruthy();
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(mockUseConnectGoogle).not.toHaveBeenCalled();
  });

  it("shows a plain account identity for authenticated accounts", () => {
    mockEmail = "ugur@example.com";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("ugur@example.com")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mockUseConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows the Google sync status without a status landmark when synced", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "HEALTHY";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Synced with Google")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a syncing label while Google is importing", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "IMPORTING";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows the syncing label while Google repair is running", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "repairing";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows syncing copy before Google metadata loads", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "checking";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows repair copy when Google sync needs attention", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "ATTENTION";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Repair needed")).toBeTruthy();
    expect(screen.queryByText("Reconnect needed")).toBeNull();
  });

  it("shows reconnect copy only when Google credentials need reconnecting", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    render(<PlannerAccountSummary />);

    expect(screen.getByText("Reconnect needed")).toBeTruthy();
  });

  it("hides the sync line when Google is not connected", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "NOT_CONNECTED";

    render(<PlannerAccountSummary />);

    expect(screen.queryByText("Synced with Google")).toBeNull();
    expect(screen.queryByText("Reconnect needed")).toBeNull();
  });
});
