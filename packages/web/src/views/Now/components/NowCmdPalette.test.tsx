import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";

// Mock pressKey
jest.mock("@web/common/utils/dom/event-emitter.util", () => ({
  pressKey: jest.fn(),
}));

// Mock onEventTargetVisibility
jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
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

  describe("Google Calendar authentication status", () => {
    beforeEach(() => {
      mockLogin.mockClear();
    });

    it("shows 'Connect Google Calendar' when metadata says not connected", () => {
      render(<NowCmdPalette />, { state: initialState });

      expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
    });

    it("shows 'Reconnect Google Calendar' when Google access was revoked", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          auth: {
            status: "idle",
            error: null,
            google: {
              connectionStatus: "reconnect_required",
              syncStatus: "none",
            },
          },
        },
      });

      expect(screen.getByText("Reconnect Google Calendar")).toBeInTheDocument();
      expect(
        screen.queryByText("Google Calendar Connected"),
      ).not.toBeInTheDocument();
    });

    it("shows 'Google Calendar Connected' when sync is healthy", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          auth: {
            status: "idle",
            error: null,
            google: {
              connectionStatus: "connected",
              syncStatus: "healthy",
            },
          },
        },
      });

      expect(screen.getByText("Google Calendar Connected")).toBeInTheDocument();
      expect(
        screen.queryByText("Connect Google Calendar"),
      ).not.toBeInTheDocument();
    });

    it("shows syncing label while Google repair is in progress", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          auth: {
            status: "idle",
            error: null,
            google: {
              connectionStatus: "connected",
              syncStatus: "repairing",
            },
          },
        },
      });

      expect(
        screen.getByText("Syncing Google Calendar..."),
      ).toBeInTheDocument();
    });

    it("triggers login when action is available", () => {
      render(<NowCmdPalette />, { state: initialState });

      fireEvent.click(screen.getByText("Connect Google Calendar"));

      expect(mockLogin).toHaveBeenCalled();
    });

    it("does not trigger login while syncing", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          auth: {
            status: "idle",
            error: null,
            google: {
              connectionStatus: "connected",
              syncStatus: "repairing",
            },
          },
        },
      });

      fireEvent.click(screen.getByText("Syncing Google Calendar..."));

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
