import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const mockOnRepairGoogle = mock();
const mockOnOpenGoogleAuth = mock();
let mockEmail: string | undefined;
let mockGoogleState: GoogleUiState = "NOT_CONNECTED";
const mockUseConnectGoogle = mock(() => ({
  state: mockGoogleState,
  onRepairGoogle: mockOnRepairGoogle,
  onOpenGoogleAuth: mockOnOpenGoogleAuth,
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
  seedPendingEventMutations(queryClient, pendingEventIds);

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
    mockOnRepairGoogle.mockClear();
    mockOnOpenGoogleAuth.mockClear();
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

  it("renders a plain, non-interactive email when Google is not connected", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "NOT_CONNECTED";

    renderSummary();

    const email = screen.getByText("ahab@pequod.com");
    expect(email.tagName).toBe("SPAN");
    expect(email).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows the healthy variant and 'Up-to-date' tooltip on hover", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "HEALTHY";

    render(<PlannerAccountSummary />);

    const email = screen.getByText("ahab@pequod.com");
    expect(email).toHaveClass("text-text-light");
    expect(screen.getByRole("status")).toHaveTextContent("Up-to-date");

    await user.hover(email);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Up-to-date");
    });
  });

  it.each([
    "IMPORTING",
    "repairing",
    "checking",
  ] as const)("shows the wave shimmer class and 'Syncing...' copy for %s", async (state) => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = state;

    render(<PlannerAccountSummary />);

    const email = screen.getByText("ahab@pequod.com");
    expect(email).toHaveClass("c-sync-text-wave");

    await user.hover(email);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Syncing...");
    });
  });

  it("shows a warning treatment and lets 'Sync now' trigger onRepairGoogle, without saying 'repair'", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "ATTENTION";

    render(<PlannerAccountSummary />);

    const trigger = screen.getByText("ahab@pequod.com");
    expect(trigger).toHaveClass("text-status-warning");
    expect(trigger.tagName).toBe("BUTTON");

    await user.hover(trigger);
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent?.toLowerCase()).not.toContain("repair");

    const syncNowButton = await screen.findByRole("button", {
      name: "Sync now",
    });
    await user.click(syncNowButton);
    expect(mockOnRepairGoogle).toHaveBeenCalledTimes(1);
  });

  it("clicking the email itself also triggers the warning action (keyboard path)", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "ATTENTION";

    render(<PlannerAccountSummary />);

    await user.click(screen.getByText("ahab@pequod.com"));
    expect(mockOnRepairGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows an error treatment and lets 'Reconnect' trigger onOpenGoogleAuth", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    render(<PlannerAccountSummary />);

    const trigger = screen.getByText("ahab@pequod.com");
    expect(trigger).toHaveClass("text-status-error");

    await user.hover(trigger);
    const reconnectButton = await screen.findByRole("button", {
      name: "Reconnect",
    });
    await user.click(reconnectButton);
    expect(mockOnOpenGoogleAuth).toHaveBeenCalledTimes(1);
  });

  it("shows a syncing-changes spinner instead of the healthy dot while an event mutation is pending", () => {
    mockEmail = "ahab@pequod.com.com";
    mockGoogleState = "HEALTHY";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
    expect(screen.queryByText("Synced with Google")).toBeNull();
  });

  it("shows the syncing-changes spinner for pending mutations even without Google", () => {
    mockEmail = "ahab@pequod.com.com";
    mockGoogleState = "NOT_CONNECTED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
  });

  it("keeps actionable Google states visible over pending event mutations", () => {
    mockEmail = "ahab@pequod.com.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Reconnect needed")).toBeTruthy();
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });

  it("keeps Google's own syncing label over pending event mutations", () => {
    mockEmail = "ahab@pequod.com.com";
    mockGoogleState = "IMPORTING";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing...")).toBeTruthy();
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });
});
