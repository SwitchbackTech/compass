import { fireEvent, screen, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import {
  resetGoogleSyncUIStateForTests,
  setRepairingSyncIndicatorOverride,
} from "@web/auth/google/state/google.sync.state";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const actualEventEmitterUtil =
  require("@web/common/utils/dom/event-emitter.util") as typeof import("@web/common/utils/dom/event-emitter.util");
const mockImportGCal = mock().mockResolvedValue(undefined);
const mockLogin = mock();
const mockPressKey = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();

mock.module("supertokens-web-js", () => ({
  default: {
    init: mockSuperTokensInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailpassword", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/emailverification", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/thirdparty", () => ({
  default: {
    init: mockRecipeInit,
  },
}));

mock.module("supertokens-web-js/recipe/session", () => ({
  attemptRefreshingSession: mock(),
  default: {
    attemptRefreshingSession: mock(),
    doesSessionExist: mock().mockResolvedValue(true),
    getAccessToken: mock().mockResolvedValue("mock-access-token"),
    getAccessTokenPayloadSecurely: mock().mockResolvedValue({}),
    getInvalidClaimsFromResponse: mock().mockResolvedValue([]),
    getUserId: mock().mockResolvedValue("mock-user-id"),
    init: mockRecipeInit,
    signOut: mock().mockResolvedValue(undefined),
    validateClaims: mock().mockResolvedValue([]),
  },
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
  useGoogleLogin: () => mock(),
}));

type CommandPaletteProps = {
  children: ReactNode;
  isOpen: boolean;
  onChangeSearch: (value: string) => void;
  placeholder: string;
  search: string;
};

type CommandPalettePageProps = {
  children: ReactNode;
};

type CommandPaletteListProps = {
  children: ReactNode;
  heading: string;
};

type CommandPaletteListItemProps = {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

mock.module("react-cmdk", () => {
  const MockCommandPalette = ({
    children,
    isOpen,
    onChangeSearch,
    placeholder,
    search,
  }: CommandPaletteProps) => {
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

  const Page = ({ children }: CommandPalettePageProps) => <div>{children}</div>;
  const List = ({ children, heading }: CommandPaletteListProps) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
  const ListItem = ({
    children,
    disabled,
    onClick,
  }: CommandPaletteListItemProps) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
  const FreeSearchAction = () => <div>No results</div>;

  const CommandPalette = Object.assign(MockCommandPalette, {
    Page,
    List,
    ListItem,
    FreeSearchAction,
  });

  return {
    __esModule: true,
    default: CommandPalette,
    filterItems: <T,>(items: T) => items,
    getItemIndex: () => 0,
  };
});

// Mock pressKey
mock.module("@web/common/utils/dom/event-emitter.util", () => ({
  ...actualEventEmitterUtil,
  pressKey: mockPressKey,
}));

// Mock onEventTargetVisibility
mock.module("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
}));

// Mock useGoogleAuth
mock.module("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    login: mockLogin,
  }),
}));

mock.module("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: mockImportGCal,
  },
}));

mock.module("@web/common/hooks/useAuthCmdItems", () => ({
  useAuthCmdItems: () => [],
}));

const { render } =
  require("@web/__tests__/utils/render.test.util") as typeof import("@web/__tests__/utils/render.test.util");
const { SyncApi } =
  require("@web/common/apis/sync.api") as typeof import("@web/common/apis/sync.api");
const { NowCmdPalette } =
  require("@web/views/Now/components/NowCmdPalette") as typeof import("@web/views/Now/components/NowCmdPalette");

describe("NowCmdPalette", () => {
  const initialState = {
    settings: {
      isCmdPaletteOpen: true,
    },
  };

  beforeEach(() => {
    mockImportGCal.mockClear();
    mockImportGCal.mockResolvedValue(undefined);
    mockLogin.mockClear();
    mockPressKey.mockClear();
    resetGoogleSyncUIStateForTests();
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
    fireEvent.click(screen.getByText("Go to Day [d]"));
    await waitFor(() => expect(mockPressKey).toHaveBeenCalledWith("d"));
  });

  it("should trigger pressKey('w') when 'Go to Week' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Go to Week [w]"));
    await waitFor(() => expect(mockPressKey).toHaveBeenCalledWith("w"));
  });

  it("should trigger pressKey('r') when 'Edit Reminder' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Edit Reminder [r]"));
    await waitFor(() => expect(mockPressKey).toHaveBeenCalledWith("r"));
  });

  it("should trigger pressKey('z') when 'Log Out' is clicked", async () => {
    render(<NowCmdPalette />, { state: initialState });
    fireEvent.click(screen.getByText("Log Out [z]"));
    await waitFor(() => expect(mockPressKey).toHaveBeenCalledWith("z"));
  });

  describe("Google Calendar authentication status", () => {
    beforeEach(() => {
      mockLogin.mockClear();
    });

    it("shows 'Connect Google Calendar' when metadata is missing", () => {
      render(<NowCmdPalette />, { state: initialState });

      expect(
        screen.getByRole("button", { name: "Connect Google Calendar" }),
      ).toBeEnabled();
    });

    it("disables the generic action when Google Calendar is healthy", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          userMetadata: {
            current: {
              google: {
                connectionState: "HEALTHY",
              },
            },
          },
        },
      });

      expect(
        screen.getByRole("button", { name: "Google Calendar Connected" }),
      ).toBeDisabled();
    });

    it("shows reconnect and triggers login when needed", async () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          userMetadata: {
            current: {
              google: {
                connectionState: "RECONNECT_REQUIRED",
              },
            },
          },
        },
      });

      fireEvent.click(
        screen.getByRole("button", { name: "Reconnect Google Calendar" }),
      );
      await waitFor(() => expect(mockLogin).toHaveBeenCalled());
    });

    it("disables the generic action while importing", () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          userMetadata: {
            current: {
              google: {
                connectionState: "IMPORTING",
              },
            },
          },
        },
      });

      const button = screen.getByRole("button", {
        name: "Syncing Google Calendar…",
      });
      expect(button).toBeDisabled();
    });

    it("shows a disabled repairing action while a repair is active", () => {
      setRepairingSyncIndicatorOverride();

      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          userMetadata: {
            current: {
              google: {
                connectionState: "ATTENTION",
              },
            },
          },
        },
      });

      expect(
        screen.getByRole("button", {
          name: "Repairing Google Calendar…",
        }),
      ).toBeDisabled();
    });

    it("starts a forced repair when sync needs attention", async () => {
      render(<NowCmdPalette />, {
        state: {
          ...initialState,
          userMetadata: {
            current: {
              google: {
                connectionState: "ATTENTION",
              },
            },
          },
        },
      });

      fireEvent.click(
        screen.getByRole("button", { name: "Repair Google Calendar" }),
      );

      await waitFor(() =>
        expect(SyncApi.importGCal).toHaveBeenCalledWith({ force: true }),
      );
    });
  });
});
