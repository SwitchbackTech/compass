import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { eventMutationKeys } from "@web/ducks/events/mutations/event.mutation.keys";
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

const { PlannerAccountSummary } =
  require("./PlannerAccountSummary") as typeof import("./PlannerAccountSummary");

const renderSummary = ({
  pendingEventIds = [],
}: {
  pendingEventIds?: string[];
} = {}) => {
  const queryClient = new QueryClient();
  for (const eventId of pendingEventIds) {
    queryClient.getMutationCache().build(
      queryClient,
      { mutationKey: eventMutationKeys.operation("edit") },
      {
        context: undefined,
        data: undefined,
        error: null,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        status: "pending",
        variables: { _id: eventId },
        submittedAt: Date.now(),
      },
    );
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <PlannerAccountSummary />
    </QueryClientProvider>,
  );
};

describe("PlannerAccountSummary", () => {
  beforeEach(() => {
    mockEmail = undefined;
    mockGoogleState = "NOT_CONNECTED";
    mockOpenModal.mockClear();
    mockUseConnectGoogle.mockClear();
  });

  it("shows a sign up prompt for temporary accounts", async () => {
    const user = userEvent.setup();

    renderSummary();

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

    renderSummary();

    expect(screen.getByText("ugur@example.com")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(mockUseConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows the Google sync status without a status landmark when synced", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "HEALTHY";

    renderSummary();

    expect(screen.getByText("Synced with Google")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a syncing label while Google is importing", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "IMPORTING";

    renderSummary();

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows the syncing label while Google repair is running", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "repairing";

    renderSummary();

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows syncing copy before Google metadata loads", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "checking";

    renderSummary();

    expect(screen.getByText("Syncing...")).toBeTruthy();
  });

  it("shows repair copy when Google sync needs attention", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "ATTENTION";

    renderSummary();

    expect(screen.getByText("Repair needed")).toBeTruthy();
    expect(screen.queryByText("Reconnect needed")).toBeNull();
  });

  it("shows reconnect copy only when Google credentials need reconnecting", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderSummary();

    expect(screen.getByText("Reconnect needed")).toBeTruthy();
  });

  it("hides the sync line when Google is not connected", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "NOT_CONNECTED";

    renderSummary();

    expect(screen.queryByText("Synced with Google")).toBeNull();
    expect(screen.queryByText("Reconnect needed")).toBeNull();
  });

  it("shows a syncing-changes spinner instead of the healthy dot while an event mutation is pending", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "HEALTHY";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
    expect(screen.queryByText("Synced with Google")).toBeNull();
  });

  it("shows the syncing-changes spinner for pending mutations even without Google", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "NOT_CONNECTED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
  });

  it("keeps actionable Google states visible over pending event mutations", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Reconnect needed")).toBeTruthy();
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });

  it("keeps Google's own syncing label over pending event mutations", () => {
    mockEmail = "ugur@example.com";
    mockGoogleState = "IMPORTING";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing...")).toBeTruthy();
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });
});
