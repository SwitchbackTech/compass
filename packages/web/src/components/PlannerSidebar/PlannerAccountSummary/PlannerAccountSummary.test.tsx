import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { seedPendingEventMutations } from "@web/__tests__/utils/event-query-test-data";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
const mockOnRepairGoogle = mock();
const mockOnOpenGoogleAuth = mock();
let mockEmail: string | undefined;
let mockGoogleState: GoogleUiState = "NOT_CONNECTED";
let mockIsAnonymousDirty = false;
const mockUseConnectGoogle = mock(() => ({
  state: mockGoogleState,
  onRepairGoogle: mockOnRepairGoogle,
  onOpenGoogleAuth: mockOnOpenGoogleAuth,
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  shouldShowAnonymousCalendarChangeSignUpPrompt: () => mockIsAnonymousDirty,
  subscribeToAuthState: () => () => {},
}));

mock.module("@web/auth/compass/user/hooks/useUser", () => ({
  useUser: () => ({
    email: mockEmail,
  }),
}));

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: mockUseConnectGoogle,
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
      ? { openModal: mockOpenModal }
      : // biome-ignore lint/correctness/useHookAtTopLevel: this is a mock.module factory, not a component - the flag is stable for the lifetime of any given render (it only flips once, in afterAll, after this file's components have unmounted).
        actualAuthModal.useAuthModal(...(args as [])),
}));

afterAll(() => {
  isAuthModalMocked = false;
});

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
    mockIsAnonymousDirty = false;
    mockOpenModal.mockClear();
    mockOnRepairGoogle.mockClear();
    mockOnOpenGoogleAuth.mockClear();
    mockUseConnectGoogle.mockClear();
  });

  it("shows a default-colored temporary account label with a sign-up tooltip before any changes are made", async () => {
    const user = userEvent.setup();

    renderSummary();

    const trigger = screen.getByRole("button", { name: "Temporary account" });
    expect(trigger).toHaveClass("text-text-light");
    expect(trigger).not.toHaveClass("c-sync-text-wave");
    expect(screen.queryByText("Sign up")).toBeNull();

    await user.hover(trigger);
    await screen.findByText("Sign up to save your changes");
    const signUpButton = await screen.findByRole("button", { name: "Sign up" });

    await user.click(signUpButton);
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(mockUseConnectGoogle).not.toHaveBeenCalled();
  });

  it("shows the wave shimmer on the temporary account label once the anonymous user makes a change", () => {
    mockIsAnonymousDirty = true;

    renderSummary();

    const trigger = screen.getByRole("button", { name: "Temporary account" });
    expect(trigger).toHaveClass("c-sync-text-wave");
    expect(trigger).not.toHaveClass("text-text-light");
  });

  it("also opens sign up by clicking the temporary account label directly (keyboard path)", async () => {
    const user = userEvent.setup();

    renderSummary();

    await user.click(screen.getByRole("button", { name: "Temporary account" }));
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
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

    renderSummary();

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
  ] as const)("shows the wave shimmer class and 'Syncing…' copy for %s", async (state) => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = state;

    renderSummary();

    const email = screen.getByText("ahab@pequod.com");
    expect(email).toHaveClass("c-sync-text-wave");

    await user.hover(email);
    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Syncing…");
    });
  });

  it("shows a warning treatment and lets 'Sync now' trigger onRepairGoogle, without saying 'repair'", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "ATTENTION";

    renderSummary();

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

    renderSummary();

    await user.click(screen.getByText("ahab@pequod.com"));
    expect(mockOnRepairGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows an error treatment and lets 'Reconnect' trigger onOpenGoogleAuth", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderSummary();

    const trigger = screen.getByText("ahab@pequod.com");
    expect(trigger).toHaveClass("text-status-error");

    await user.hover(trigger);
    const reconnectButton = await screen.findByRole("button", {
      name: "Reconnect",
    });
    await user.click(reconnectButton);
    expect(mockOnOpenGoogleAuth).toHaveBeenCalledTimes(1);
  });

  it("shows a syncing-changes indicator instead of the healthy state while an event mutation is pending", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "HEALTHY";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
    expect(screen.queryByText("Up-to-date")).toBeNull();
  });

  it("shows the syncing-changes indicator for pending mutations even without Google", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "NOT_CONNECTED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing changes…")).toBeTruthy();
  });

  it("keeps actionable Google states visible over pending event mutations", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByRole("status")).toHaveTextContent("needs reconnecting");
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });

  it("keeps Google's own syncing label over pending event mutations", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "IMPORTING";

    renderSummary({ pendingEventIds: ["event-1"] });

    expect(screen.getByText("Syncing…")).toBeTruthy();
    expect(screen.queryByText("Syncing changes…")).toBeNull();
  });
});
