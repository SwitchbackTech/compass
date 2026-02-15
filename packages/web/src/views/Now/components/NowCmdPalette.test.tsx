import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";
import { ONBOARDING_RESTART_EVENT } from "@web/views/Onboarding/constants/onboarding.constants";
import { resetOnboardingProgress } from "@web/views/Onboarding/utils/onboarding.storage.util";

// Mock pressKey
jest.mock("@web/common/utils/dom/event-emitter.util", () => ({
  pressKey: jest.fn(),
}));

// Mock onEventTargetVisibility
jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
}));

// Mock resetOnboardingProgress
jest.mock("@web/views/Onboarding/utils/onboarding.storage.util", () => ({
  ...jest.requireActual("@web/views/Onboarding/utils/onboarding.storage.util"),
  resetOnboardingProgress: jest.fn(),
}));

// Mock useSession for auth state tests
const mockSetAuthenticated = jest.fn();
let mockAuthenticated = false;
jest.mock("@web/auth/hooks/session/useSession", () => ({
  useSession: () => ({
    authenticated: mockAuthenticated,
    setAuthenticated: mockSetAuthenticated,
  }),
}));

// Mock useGoogleAuth
const mockLogin = jest.fn();
jest.mock("@web/auth/hooks/oauth/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    login: mockLogin,
  }),
}));

describe("NowCmdPalette", () => {
  const initialState = {
    settings: {
      isCmdPaletteOpen: true,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render when open", () => {
    render(<NowCmdPalette />, { state: initialState });
    expect(
      screen.getByPlaceholderText("Try: 'day', 'week', 'bug', or 'code'"),
    ).toBeInTheDocument();
  });

  it("should not render when closed", () => {
    render(<NowCmdPalette />, {
      state: {
        settings: {
          isCmdPaletteOpen: false,
        },
      },
    });
    expect(
      screen.queryByPlaceholderText("Try: 'day', 'week', 'bug', or 'code'"),
    ).not.toBeInTheDocument();
  });

  it("should display navigation items", () => {
    render(<NowCmdPalette />, { state: initialState });
    expect(screen.getByText("Go to Day [d]")).toBeInTheDocument();
    expect(screen.getByText("Go to Week [w]")).toBeInTheDocument();
    expect(screen.getByText("Edit Reminder [r]")).toBeInTheDocument();
    expect(screen.getByText("Re-do onboarding")).toBeInTheDocument();
    expect(screen.getByText("Log Out [z]")).toBeInTheDocument();
  });

  it("should trigger pressKey('d') when 'Go to Day' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Go to Day [d]"));
    expect(pressKey).toHaveBeenCalledWith("d");
  });

  it("should trigger pressKey('w') when 'Go to Week' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Go to Week [w]"));
    expect(pressKey).toHaveBeenCalledWith("w");
  });

  it("should trigger pressKey('r') when 'Edit Reminder' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Edit Reminder [r]"));
    expect(pressKey).toHaveBeenCalledWith("r");
  });

  it("should trigger pressKey('z') when 'Log Out' is clicked", () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Log Out [z]"));
    expect(pressKey).toHaveBeenCalledWith("z");
  });

  it("should reset onboarding and dispatch restart event when 'Re-do onboarding' is clicked", () => {
    const mockDispatchEvent = jest.spyOn(window, "dispatchEvent");
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Re-do onboarding"));
    expect(resetOnboardingProgress).toHaveBeenCalled();
    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: ONBOARDING_RESTART_EVENT,
      }),
    );
    mockDispatchEvent.mockRestore();
  });

  describe("Google Calendar authentication status", () => {
    beforeEach(() => {
      mockLogin.mockClear();
    });

    it("shows 'Connect Google Calendar' when not authenticated", () => {
      mockAuthenticated = false;
      render(<NowCmdPalette />, { state: initialState });

      expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
      expect(
        screen.queryByText("Google Calendar Connected"),
      ).not.toBeInTheDocument();
    });

    it("shows 'Google Calendar Connected' when authenticated", () => {
      mockAuthenticated = true;
      render(<NowCmdPalette />, { state: initialState });

      expect(screen.getByText("Google Calendar Connected")).toBeInTheDocument();
      expect(
        screen.queryByText("Connect Google Calendar"),
      ).not.toBeInTheDocument();
    });

    it("triggers login when 'Connect Google Calendar' is clicked and not authenticated", () => {
      mockAuthenticated = false;
      render(<NowCmdPalette />, { state: initialState });

      fireEvent.click(screen.getByText("Connect Google Calendar"));

      expect(mockLogin).toHaveBeenCalled();
    });

    it("does not trigger login when 'Google Calendar Connected' is clicked", () => {
      mockAuthenticated = true;
      render(<NowCmdPalette />, { state: initialState });

      fireEvent.click(screen.getByText("Google Calendar Connected"));

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
