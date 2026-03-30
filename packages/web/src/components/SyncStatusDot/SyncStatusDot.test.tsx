import type React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type GoogleUiConfig } from "@web/auth/hooks/google/useConnectGoogle/useConnectGoogle.types";
import { type CompassSession } from "@web/auth/session/session.types";
import { type AuthView } from "@web/components/AuthModal/hooks/useAuthModal";
import { SyncStatusDot } from "./SyncStatusDot";

interface MockConnectGoogleResult {
  commandAction: GoogleUiConfig["commandAction"];
  isRepairing: boolean;
  sidebarStatus: GoogleUiConfig["sidebarStatus"];
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

jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: (): CompassSession => mockUseSession(),
}));

jest.mock("@web/auth/hooks/google/useConnectGoogle/useConnectGoogle", () => ({
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
  DotOutlineIcon: ({ className }: { className?: string }) => (
    <span aria-label="sync-dot-icon">{className ?? ""}</span>
  ),
  SpinnerGap: () => <span aria-label="spinner-gap" />,
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

describe("SyncStatusDot", () => {
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
        dotColor: "error",
        icon: "DotIcon",
        isDisabled: false,
        onSelect: mockGoogleOnSelect,
        tooltip: "Google Calendar needs reconnecting. Click to reconnect.",
      },
    });
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockReturnValue(false);
  });

  it("renders the anonymous sign-up warning dot and opens sign up when clicked", async () => {
    const user = userEvent.setup();
    mockShouldShowAnonymousCalendarChangeSignUpPrompt.mockReturnValue(true);

    render(<SyncStatusDot />);

    expect(
      screen.getByRole("status", {
        name: /sign up to save your calendar changes/i,
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /sign up to save your calendar changes/i,
      }),
    );

    expect(screen.getByLabelText("sync-dot-icon")).toHaveTextContent(
      "motion-safe:animate-sync-dot-pulse",
    );
    expect(screen.getByLabelText("sync-dot-icon")).toHaveTextContent(
      "hover:scale-110",
    );
    expect(mockOpenModal).toHaveBeenCalledWith("signUp");
    expect(mockGoogleOnSelect).not.toHaveBeenCalled();
  });

  it("falls back to the existing Google status when the prompt is inactive", async () => {
    const user = userEvent.setup();

    render(<SyncStatusDot />);

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

    expect(screen.getByLabelText("sync-dot-icon")).not.toHaveTextContent(
      "motion-safe:animate-sync-dot-pulse",
    );
    expect(mockGoogleOnSelect).toHaveBeenCalled();
    expect(mockOpenModal).not.toHaveBeenCalled();
  });
});
