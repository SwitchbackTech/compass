import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { pressKey } from "@web/common/utils/dom/event-emitter.util";
import { NowCmdPalette } from "@web/views/Now/components/NowCmdPalette";

jest.mock("react-cmdk", () => {
  const React = require("react");

  const CommandPalette = ({
    children,
    isOpen,
    onChangeSearch,
    placeholder,
    search,
  }: any) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div>
        <input
          onChange={(event) => onChangeSearch(event.target.value)}
          placeholder={placeholder}
          value={search}
        />
        {children}
      </div>
    );
  };

  CommandPalette.Page = ({ children }: any) => <div>{children}</div>;
  CommandPalette.List = ({ children, heading }: any) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
  CommandPalette.ListItem = ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  );
  CommandPalette.FreeSearchAction = () => <div>No results</div>;

  return {
    __esModule: true,
    default: CommandPalette,
    filterItems: (items: unknown) => items,
    getItemIndex: () => 0,
  };
});

// Mock pressKey
jest.mock("@web/common/utils/dom/event-emitter.util", () => ({
  ...jest.requireActual("@web/common/utils/dom/event-emitter.util"),
  pressKey: jest.fn(),
}));

// Mock onEventTargetVisibility
jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
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
    expect(screen.getByText("Log Out [z]")).toBeInTheDocument();
  });

  it("should trigger pressKey('d') when 'Go to Day' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    act(() => fireEvent.click(screen.getByText("Go to Day [d]")));
    await waitFor(() => expect(pressKey).toHaveBeenCalledWith("d"));
  });

  it("should trigger pressKey('w') when 'Go to Week' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    act(() => fireEvent.click(screen.getByText("Go to Week [w]")));
    await waitFor(() => expect(pressKey).toHaveBeenCalledWith("w"));
  });

  it("should trigger pressKey('r') when 'Edit Reminder' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    act(() => fireEvent.click(screen.getByText("Edit Reminder [r]")));
    await waitFor(() => expect(pressKey).toHaveBeenCalledWith("r"));
  });

  it("should trigger pressKey('z') when 'Log Out' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    act(() => fireEvent.click(screen.getByText("Log Out [z]")));
    await waitFor(() => expect(pressKey).toHaveBeenCalledWith("z"));
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

    it("triggers login when 'Connect Google Calendar' is clicked and not authenticated", async () => {
      mockAuthenticated = false;
      render(<NowCmdPalette />, { state: initialState });

      act(() => fireEvent.click(screen.getByText("Connect Google Calendar")));
      await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    });

    it("does not trigger login when 'Google Calendar Connected' is clicked", async () => {
      mockAuthenticated = true;
      render(<NowCmdPalette />, { state: initialState });

      act(() => fireEvent.click(screen.getByText("Google Calendar Connected")));

      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
