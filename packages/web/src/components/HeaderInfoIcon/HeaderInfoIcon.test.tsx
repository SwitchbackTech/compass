import type React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  type GoogleUiConfig,
  type GoogleUiState,
} from "@web/auth/google/hooks/useConnectGoogle/useConnectGoogle.types";
import { type CompassSession } from "@web/auth/session/session.types";
import { type AuthView } from "@web/components/AuthModal/hooks/useAuthModal";
import { HeaderInfoIcon } from "./HeaderInfoIcon";

interface MockConnectGoogleResult {
  commandAction: GoogleUiConfig["commandAction"];
  isRepairing: boolean;
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
  state: GoogleUiState;
}

const mockOpenModal = jest.fn<void, [AuthView?]>();
const mockGoogleOnSelect = jest.fn<void, []>();
const mockUseSession = jest.fn<CompassSession, []>();
const mockUseConnectGoogle = jest.fn<MockConnectGoogleResult, []>();
const mockShouldShowAnonymousCalendarChangeSignUpPrompt = jest.fn<
  boolean,
  []
>();
const mockSubscribeToAuthState = jest.fn<() => void, [() => void]>(
  () => () => {},
);

jest.mock("@web/auth/session/useSession", () => ({
  useSession: (): CompassSession => mockUseSession(),
}));

jest.mock("@web/auth/google/hooks/useConnectGoogle/useConnectGoogle", () => ({
  useConnectGoogle: (): MockConnectGoogleResult => mockUseConnectGoogle(),
}));

jest.mock("@web/auth/state/auth.state.util", () => ({
  shouldShowAnonymousCalendarChangeSignUpPrompt: (): boolean =>
    mockShouldShowAnonymousCalendarChangeSignUpPrompt(),
  subscribeToAuthState: (listener: () => void): (() => void) =>
    mockSubscribeToAuthState(listener),
}));

jest.mock("@web/components/AuthModal/hooks/useAuthModal", () => ({
  useAuthModal: () => ({
    openModal: mockOpenModal,
  }),
}));

jest.mock("@phosphor-icons/react", () => ({
  InfoIcon: ({ className }: { className?: string }) => (
    <span aria-label="header-info-icon">{className ?? ""}</span>
  ),
  SpinnerGapIcon: () => <span aria-label="spinner-gap" />,
}));

jest.mock("@web/components/Tooltip/TooltipWrapper", () => ({
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

describe("HeaderInfoIcon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({
      authenticated: false,
      setAuthenticated: jest.fn(),
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
