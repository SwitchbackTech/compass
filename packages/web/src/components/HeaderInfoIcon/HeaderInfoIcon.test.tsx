import type React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type CompassSession } from "@web/auth/compass/session/session.types";
import {
  type GoogleUiConfig,
  type GoogleUiState,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { type AuthView } from "@web/components/AuthModal/hooks/useAuthModal";
import { beforeEach, describe, expect, it, mock } from "bun:test";

interface MockConnectGoogleResult {
  commandAction: GoogleUiConfig["commandAction"];
  isRepairing: boolean;
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
  state: GoogleUiState;
}

const mockOpenModal = mock((_: AuthView | undefined = undefined) => undefined);
const mockGoogleOnSelect = mock();
const mockUseSession = mock(
  (): CompassSession => ({
    authenticated: false,
    setAuthenticated: mock(),
  }),
);
const mockUseConnectGoogle = mock(
  (): MockConnectGoogleResult => ({
    commandAction: {
      icon: "CloudArrowUpIcon",
      isDisabled: false,
      label: "Reconnect Google Calendar",
      onSelect: mockGoogleOnSelect,
    },
    isRepairing: false,
    sidebarStatus: {
      iconColor: "error",
      isDisabled: false,
      onSelect: mockGoogleOnSelect,
      tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
    },
    state: "RECONNECT_REQUIRED",
  }),
);
const mockShouldShowAnonymousCalendarChangeSignUpPrompt = mock(() => false);
const mockSubscribeToAuthState = mock(() => () => {});

mock.module("@web/auth/compass/session/useSession", () => ({
  useSession: (): CompassSession => mockUseSession(),
}));

mock.module("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (): MockConnectGoogleResult => mockUseConnectGoogle(),
}));

mock.module("@web/auth/compass/state/auth.state.util", () => ({
  shouldShowAnonymousCalendarChangeSignUpPrompt: (): boolean =>
    mockShouldShowAnonymousCalendarChangeSignUpPrompt(),
  subscribeToAuthState: (listener: () => void): (() => void) =>
    mockSubscribeToAuthState(listener),
}));

mock.module("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

mock.module("@phosphor-icons/react", () => ({
  InfoIcon: ({ className }: { className?: string }) => (
    <span role="img" aria-label="header-info-icon">
      {className ?? ""}
    </span>
  ),
  SpinnerGapIcon: () => <span role="img" aria-label="spinner-gap" />,
  SpinnerIcon: () => <span role="img" aria-label="spinner-gap" />,
}));

mock.module("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({
    children,
    description,
    disabled,
    onClick,
  }: {
    children: React.ReactNode;
    description?: string;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      aria-label={description}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

const { HeaderInfoIcon } =
  require("./HeaderInfoIcon") as typeof import("./HeaderInfoIcon");

describe("HeaderInfoIcon", () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
    mockGoogleOnSelect.mockClear();
    mockUseSession.mockClear();
    mockUseConnectGoogle.mockClear();
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockClear();
    mockSubscribeToAuthState.mockClear();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: mock(),
    });
    mockUseConnectGoogle.mockReturnValue({
      commandAction: {
        icon: "CloudArrowUpIcon",
        isDisabled: false,
        label: "Reconnect Google Calendar",
        onSelect: mockGoogleOnSelect,
      },
      isRepairing: false,
      sidebarStatus: {
        iconColor: "error",
        isDisabled: false,
        onSelect: mockGoogleOnSelect,
        tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
      },
      state: "RECONNECT_REQUIRED",
    });
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockReturnValue(false);
  });

  it("renders the anonymous sign-up warning dot and opens sign up when clicked", async () => {
    const user = userEvent.setup();
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockReturnValue(true);

    render(<HeaderInfoIcon />);

    expect(
      screen.getByRole("status", {
        name: /sign up to save your changes/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /sign up to save your changes/i,
      }),
    );

    expect(screen.getByLabelText("header-info-icon")).toHaveTextContent(
      "motion-safe:animate-sync-dot-pulse",
    );
    expect(screen.getByLabelText("header-info-icon")).toHaveTextContent(
      "motion-safe:group-hover:animate-none",
    );
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(mockGoogleOnSelect).not.toHaveBeenCalled();
  });

  it("falls back to the existing Google status when the prompt is inactive", async () => {
    const user = userEvent.setup();

    render(<HeaderInfoIcon />);

    expect(
      screen.getByRole("status", {
        name: /google calendar needs reconnecting/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /google calendar needs reconnecting/i,
      }),
    );

    expect(screen.getByLabelText("header-info-icon")).not.toHaveTextContent(
      "motion-safe:animate-sync-dot-pulse",
    );
    expect(mockGoogleOnSelect).toHaveBeenCalled();
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it("renders the background import spinner instead of the info icon while importing", () => {
    mockUseConnectGoogle.mockReturnValue({
      commandAction: {
        icon: "CloudArrowUpIcon",
        isDisabled: true,
        label: "Syncing Google Calendar…",
      },
      isRepairing: false,
      sidebarStatus: {
        isDisabled: true,
        tooltip: "Google Calendar is syncing in the background.",
      },
      state: "IMPORTING",
    });

    render(<HeaderInfoIcon />);

    expect(
      screen.getByRole("status", {
        name: /syncing google calendar in the background/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /syncing google calendar in the background/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("spinner-gap")).toBeInTheDocument();
    expect(screen.queryByLabelText("header-info-icon")).not.toBeInTheDocument();
  });

  it("renders the repairing spinner instead of the warning icon while repairing", () => {
    mockUseConnectGoogle.mockReturnValue({
      commandAction: {
        icon: "CloudArrowUpIcon",
        isDisabled: true,
        label: "Repairing Google Calendar…",
      },
      isRepairing: true,
      sidebarStatus: {
        iconColor: "warning",
        isDisabled: true,
        tooltip: "Repairing Google Calendar in the background.",
      },
      state: "repairing",
    });

    render(<HeaderInfoIcon />);

    expect(
      screen.getByRole("status", {
        name: /repairing google calendar in the background/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /repairing google calendar in the background/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("spinner-gap")).toBeInTheDocument();
    expect(screen.queryByLabelText("header-info-icon")).not.toBeInTheDocument();
  });
});
