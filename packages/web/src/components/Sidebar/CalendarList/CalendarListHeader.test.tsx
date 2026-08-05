import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleUiState } from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { userMetadataActions } from "@web/auth/state/user-metadata.store";
import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test";

const mockOpenModal = mock();
let mockEmail: string | undefined;
let mockGoogleState: GoogleUiState = "NOT_CONNECTED";
let mockIsAnonymousDirty = false;
const mockConnectGoogle = mock();
const googleCommandActionFor = (state: GoogleUiState) => {
  switch (state) {
    case "NOT_CONNECTED":
      return { label: "Connect Google Calendar", onSelect: mockConnectGoogle };
    case "RECONNECT_REQUIRED":
      return {
        label: "Reconnect Google Calendar",
        onSelect: mockConnectGoogle,
      };
    case "ATTENTION":
      return { label: "Refresh calendar", onSelect: mockConnectGoogle };
    default:
      return null;
  }
};
let mockIsConnecting = false;
let mockIsRefreshing = false;
const mockUseConnectGoogle = mock(() => ({
  state: mockGoogleState,
  isAvailable: true,
  isConnecting: mockIsConnecting,
  isRefreshing: mockIsRefreshing,
  commandAction: googleCommandActionFor(mockGoogleState),
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

// CalendarListHeader.tsx is already cached by the time this file runs -
// CalendarList.test.tsx (which sorts before this file) imports
// CalendarList.tsx, whose own top-level import evaluated this module and
// bound its hook imports to whatever was active at that earlier point. A plain
// require here would return that stale instance. A cache-busted URL forces a
// fresh evaluation that re-resolves the hooks against the mocks above (same
// technique as CalendarList.test.tsx).
const headerModuleUrl = new URL(
  `./CalendarListHeader.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { CalendarListHeader } = (await import(
  headerModuleUrl.href
)) as typeof import("./CalendarListHeader");

const renderHeader = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CalendarListHeader />
    </QueryClientProvider>,
  );

describe("CalendarListHeader", () => {
  beforeEach(() => {
    mockEmail = undefined;
    mockGoogleState = "NOT_CONNECTED";
    mockIsConnecting = false;
    mockIsRefreshing = false;
    mockIsAnonymousDirty = false;
    mockOpenModal.mockClear();
    mockUseConnectGoogle.mockClear();
    mockConnectGoogle.mockClear();
    userMetadataActions.clear();
  });

  it("shows a local-storage heading with a sign-up tooltip before any changes are made", async () => {
    const user = userEvent.setup();

    renderHeader();

    expect(
      screen.getByRole("heading", { name: "This browser" }),
    ).toBeInTheDocument();
    const trigger = screen.getByRole("button", {
      name: "This browser",
    });
    expect(trigger).toHaveClass("text-text");
    expect(trigger).not.toHaveClass("c-sync-text-wave");
    expect(screen.queryByText("Sign up")).toBeNull();

    await user.hover(trigger);
    await screen.findByText("Sign up to save your changes across browsers");
    const signUpButton = await screen.findByRole("button", { name: "Sign up" });

    await user.click(signUpButton);
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(mockUseConnectGoogle).not.toHaveBeenCalled();
  });

  it("shows the wave shimmer on the local-storage label once the anonymous user makes a change", () => {
    mockIsAnonymousDirty = true;

    renderHeader();

    const trigger = screen.getByRole("button", {
      name: "This browser",
    });
    expect(trigger).toHaveClass("c-sync-text-wave");
    expect(trigger).not.toHaveClass("text-text");
  });

  it("also opens sign up by clicking the local-storage label directly (keyboard path)", async () => {
    const user = userEvent.setup();

    renderHeader();

    await user.click(screen.getByRole("button", { name: "This browser" }));
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
  });

  it("shows a connect Google button when authenticated and Google is not connected", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "NOT_CONNECTED";

    renderHeader();

    expect(
      screen.getByRole("heading", { name: "ahab@pequod.com" }),
    ).toBeInTheDocument();
    const connectButton = screen.getByRole("button", {
      name: "Connect Google Calendar",
    });
    await user.click(connectButton);
    expect(mockConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("stays quiet (no status line) when Google is healthy, to cut sidebar noise", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "HEALTHY";

    renderHeader();

    const email = screen.getByText("ahab@pequod.com");
    expect(email.tagName).toBe("SPAN");
    expect(email).toHaveClass("text-text-muted");
    expect(email).not.toHaveClass("c-sync-text-wave");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Updated/)).toBeNull();

    await user.hover(email);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the wave shimmer on the email while the first calendar import is in progress", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "IMPORTING";

    renderHeader();

    const email = screen.getByText("ahab@pequod.com");
    expect(email).toHaveClass("c-sync-text-wave");
    // The status text itself now lives in the pinned SidebarStatusBar, not
    // inline here - see SidebarStatusBar.test.tsx.
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    await user.hover(email);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows a refresh calendar button when the calendar is out of date", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "ATTENTION";

    renderHeader();

    const email = screen.getByText("ahab@pequod.com");
    expect(email.tagName).toBe("SPAN");
    expect(email).toHaveClass("text-text-muted");
    expect(email).not.toHaveClass("text-warning");

    const syncButton = screen.getByRole("button", {
      name: "Refresh calendar",
    });
    await user.click(syncButton);
    expect(mockConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows a reconnect Google button when reconnect is required", async () => {
    const user = userEvent.setup();
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";

    renderHeader();

    const email = screen.getByText("ahab@pequod.com");
    expect(email).toHaveClass("text-text-muted");
    expect(email).not.toHaveClass("text-error");

    const reconnectButton = screen.getByRole("button", {
      name: "Reconnect Google Calendar",
    });
    expect(reconnectButton).toBeEnabled();
    expect(reconnectButton).not.toHaveAttribute("aria-busy");
    await user.click(reconnectButton);
    expect(mockConnectGoogle).toHaveBeenCalledTimes(1);
  });

  it("shows an immediate reconnecting state while Google OAuth is starting", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";
    mockIsConnecting = true;

    renderHeader();

    const reconnectButton = screen.getByRole("button", {
      name: "Reconnecting…",
    });
    expect(reconnectButton).toBeDisabled();
    expect(reconnectButton).toHaveAttribute("aria-busy", "true");
    expect(
      screen.queryByRole("button", { name: "Reconnect Google Calendar" }),
    ).toBeNull();
  });

  it("shows an immediate connecting state while first-time Google OAuth is starting", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "NOT_CONNECTED";
    mockIsConnecting = true;

    renderHeader();

    const connectButton = screen.getByRole("button", {
      name: "Connecting…",
    });
    expect(connectButton).toBeDisabled();
    expect(connectButton).toHaveAttribute("aria-busy", "true");
  });

  it("shows an immediate refresh-request status while a calendar refresh starts", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "ATTENTION";
    mockIsRefreshing = true;

    renderHeader();

    const refreshButton = screen.getByRole("button", {
      name: "Refreshing…",
    });
    expect(refreshButton).toBeDisabled();
    expect(refreshButton).toHaveAttribute("aria-busy", "true");
  });

  it("keeps an established calendar calm during reconciliation", () => {
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "HEALTHY";
    const connection = {
      id: "conn-1",
      state: "catchingUp",
      stateReason: null,
      lastSyncedAt: new Date().toISOString(),
      lastHealthyAt: new Date().toISOString(),
      accountEmail: "ahab@pequod.com",
      connectionState: "IMPORTING" as const,
    };
    userMetadataActions.set({
      google: {
        connectionState: "IMPORTING",
        connections: [connection],
      },
    });

    renderHeader();

    // Resolves to "healthy" (not "syncing"), so the sidebar shows nothing at
    // all rather than either status text - full detail lives in Settings.
    expect(screen.queryByText("Adding your calendar…")).toBeNull();
    expect(screen.queryByText(/Updated/)).toBeNull();
  });

  it("scopes to the connection matching the signed-in user's own email, not sync's aggregate precedence winner across every connected account", () => {
    // The 2026-08-04 bug: with two accounts connected, a broken connection
    // on the OTHER account made this header - which is keyed to the signed-in
    // user's OWN email - flash "needs reconnecting" anyway, because it was
    // reading the precedence-winning connection across ALL connections instead
    // of specifically this user's own.
    mockEmail = "ahab@pequod.com";
    mockGoogleState = "RECONNECT_REQUIRED";
    const ownConnection = {
      id: "conn-mine",
      state: "healthy",
      stateReason: null,
      lastSyncedAt: new Date().toISOString(),
      lastHealthyAt: new Date().toISOString(),
      accountEmail: "ahab@pequod.com",
      connectionState: "HEALTHY" as const,
    };
    const otherAccountsBrokenConnection = {
      id: "conn-other",
      state: "actionRequired",
      stateReason: "authorizationRevoked",
      lastSyncedAt: null,
      lastHealthyAt: null,
      accountEmail: "starbuck@pequod.com",
      connectionState: "RECONNECT_REQUIRED" as const,
    };
    userMetadataActions.set({
      google: {
        connectionState: "RECONNECT_REQUIRED",
        connections: [otherAccountsBrokenConnection, ownConnection],
      },
    });

    renderHeader();

    expect(mockUseConnectGoogle).toHaveBeenCalledWith({
      connection: ownConnection,
    });
  });
});
