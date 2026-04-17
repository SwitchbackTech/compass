import { resolveModifier } from "@tanstack/react-hotkeys";
import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { ROOT_ROUTES } from "@web/common/constants/routes";
import { settingsSlice } from "@web/ducks/settings/slices/settings.slice";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const actualReactRouterDom =
  require("react-router-dom") as typeof import("react-router-dom");
const actualStoreHooks =
  require("@web/store/store.hooks") as typeof import("@web/store/store.hooks");
const actualEventUtil =
  require("@web/common/utils/event/event.util") as typeof import("@web/common/utils/event/event.util");
const mockDispatch = mock();
const mockGoToToday = mock();
const mockImportGCal = mock().mockResolvedValue(undefined);
const mockLogin = mock();
const mockLocation = { pathname: "/" };
const mockNavigate = mock();
const mockOpenEventFormCreateEvent = mock();
const mockOpenEventFormEditEvent = mock();
const mockRecipeInit = mock(() => ({}));
const mockSuperTokensInit = mock();
const mockUseGoogleAuth = mock();
const mockUseLocation = mock();
const mockUseNavigate = mock();

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

mock.module("react-router-dom", () => ({
  ...actualReactRouterDom,
  useLocation: mockUseLocation,
  useNavigate: mockUseNavigate,
}));

// Mock react-cmdk (ListItem must accept disabled and render a real button for toBeDisabled())
mock.module("react-cmdk", () => {
  type CommandPaletteProps = {
    children: ReactNode;
    isOpen: boolean;
    onChangeSearch: (value: string) => void;
    placeholder: string;
    search: string;
  };

  type PageProps = { children: ReactNode };
  type ListProps = PageProps & { heading?: string };
  type ListItemProps = PageProps & {
    disabled?: boolean;
    onClick?: () => void;
  };

  const CommandPalette = ({
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

  CommandPalette.Page = ({ children }: PageProps) => <div>{children}</div>;
  CommandPalette.List = ({ children, heading }: ListProps) => (
    <section>
      <h2>{heading}</h2>
      {children}
    </section>
  );
  CommandPalette.ListItem = ({
    children,
    disabled,
    onClick,
  }: ListItemProps) => (
    <button disabled={disabled} onClick={onClick} type="button">
      {children}
    </button>
  );
  CommandPalette.FreeSearchAction = () => <div>No results</div>;

  function filterItems(
    items: Array<{
      heading?: string;
      id: string;
      items: Array<{ children?: string }>;
    }>,
    search?: string,
  ) {
    if (!search?.trim()) return items;
    const q = search.toLowerCase().trim();
    return items
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          String(item.children ?? "")
            .toLowerCase()
            .includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }

  return {
    __esModule: true,
    default: CommandPalette,
    filterItems,
    getItemIndex: () => 0,
  };
});

// Mock dayjs
mock.module("@core/util/date/dayjs", () => ({
  __esModule: true,
  default: mock(() => ({
    format: mock(() => "Monday, November 24"),
    startOf: mock(function (this: unknown) {
      return this;
    }),
    endOf: mock(function (this: unknown) {
      return this;
    }),
  })),
}));

// Mock onEventTargetVisibility
mock.module("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (callback: () => void) => callback,
}));

// Mock event utility functions
mock.module("@web/common/utils/event/event.util", () => ({
  ...actualEventUtil,
  openEventFormCreateEvent: mockOpenEventFormCreateEvent,
  openEventFormEditEvent: mockOpenEventFormEditEvent,
}));

mock.module("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: mockImportGCal,
  },
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: actualStoreHooks.useAppSelector,
}));

mock.module("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth", () => ({
  useGoogleAuth: mockUseGoogleAuth,
}));

mock.module("@web/common/hooks/useAuthCmdItems", () => ({
  useAuthCmdItems: () => [],
}));

const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { SyncApi } =
  require("@web/common/apis/sync.api") as typeof import("@web/common/apis/sync.api");
const { useGlobalShortcuts } =
  require("@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts") as typeof import("@web/views/Calendar/hooks/shortcuts/useGlobalShortcuts");
const { DayCmdPalette } =
  require("@web/views/Day/components/DayCmdPalette") as typeof import("@web/views/Day/components/DayCmdPalette");

function Component() {
  useGlobalShortcuts();

  return <DayCmdPalette />;
}

describe("DayCmdPalette", () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockGoToToday.mockClear();
    mockImportGCal.mockClear();
    mockLogin.mockClear();
    mockNavigate.mockClear();
    mockOpenEventFormCreateEvent.mockClear();
    mockOpenEventFormEditEvent.mockClear();
    mockUseGoogleAuth.mockClear();
    mockUseLocation.mockClear();
    mockUseNavigate.mockClear();

    mockImportGCal.mockResolvedValue(undefined);
    mockUseGoogleAuth.mockReturnValue({ login: mockLogin });
    mockUseNavigate.mockReturnValue(mockNavigate);
    mockUseLocation.mockReturnValue(mockLocation);
  });

  it("renders navigation items when open", async () => {
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("Go to Now [n]")).toBeInTheDocument();
    expect(screen.getByText("Go to Week [w]")).toBeInTheDocument();
    expect(screen.getByText("Create event")).toBeInTheDocument();
    expect(screen.getByText("Edit event [m]")).toBeInTheDocument();
    expect(
      screen.getByText("Go to Today (Monday, November 24) [t]"),
    ).toBeInTheDocument();
    expect(screen.getByText("Log Out [z]")).toBeInTheDocument();
  });

  it("does not render when closed", async () => {
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: false } },
    });

    expect(screen.queryByText("Navigation")).not.toBeInTheDocument();
  });

  it("closes the command palette when Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    // Simulate CMD+k key press to open
    const mod = resolveModifier("Mod");
    await user.keyboard(`{${mod}>}k{/${mod}}`);

    expect(screen.getByText("Navigation")).toBeInTheDocument();

    // Simulate Escape key press
    fireEvent.keyDown(document, { key: "Escape" });

    expect(mockDispatch).toHaveBeenCalledWith(
      settingsSlice.actions.closeCmdPalette(),
    );
  });

  it("navigates to now when Go to Now is clicked", async () => {
    const user = userEvent.setup();
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    await user.click(screen.getByText("Go to Now [n]"));

    expect(mockNavigate).toHaveBeenCalledWith("/now");
  });

  it("navigates to week when Go to Week is clicked", async () => {
    const user = userEvent.setup();
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    await user.click(screen.getByText("Go to Week [w]"));

    expect(mockNavigate).toHaveBeenCalledWith(ROOT_ROUTES.WEEK);
  });

  it("calls onGoToToday when Go to Today is clicked", async () => {
    const user = userEvent.setup();
    render(<DayCmdPalette onGoToToday={mockGoToToday} />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    await user.click(screen.getByText("Go to Today (Monday, November 24) [t]"));

    expect(mockGoToToday).toHaveBeenCalled();
  });

  it("navigates to logout when Log Out is clicked", async () => {
    const user = userEvent.setup();
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    await user.click(screen.getByText("Log Out [z]"));

    expect(mockNavigate).toHaveBeenCalledWith("/logout");
  });

  it("calls openEventFormEditEvent when Edit event is clicked", async () => {
    const user = userEvent.setup();

    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    const editEventBtn = await screen.findByRole("button", {
      name: /edit event \[m\]/i,
    });

    await user.click(editEventBtn);

    expect(mockOpenEventFormEditEvent).toHaveBeenCalled();
  });

  it("calls openEventFormCreateEvent when Create event is clicked", async () => {
    const user = userEvent.setup();

    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    const createEventBtn = await screen.findByRole("button", {
      name: /create event/i,
    });

    await user.click(createEventBtn);

    expect(mockOpenEventFormCreateEvent).toHaveBeenCalled();
  });

  it("filters items based on search input", async () => {
    const user = userEvent.setup();
    render(<Component />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    const searchInput = screen.getByPlaceholderText(
      "Try: 'now', 'week', 'today', 'bug', or 'code'",
    );

    await user.type(searchInput, "now");

    expect(screen.getByText("Go to Now [n]")).toBeInTheDocument();
    expect(screen.queryByText("Go to Week [w]")).not.toBeInTheDocument();
  });

  describe("Google Calendar authentication status", () => {
    beforeEach(() => {
      mockUseGoogleAuth.mockReturnValue({ login: mockLogin });
    });

    it("shows 'Connect Google Calendar' when metadata is missing", async () => {
      render(<DayCmdPalette />, {
        state: { settings: { isCmdPaletteOpen: true } },
      });

      expect(screen.getByText("Connect Google Calendar")).toBeInTheDocument();
    });

    it("disables the generic action when Google Calendar is healthy", async () => {
      render(<DayCmdPalette />, {
        state: {
          settings: { isCmdPaletteOpen: true },
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

    it("triggers login when reconnect is required", async () => {
      const user = userEvent.setup();
      render(<DayCmdPalette />, {
        state: {
          settings: { isCmdPaletteOpen: true },
          userMetadata: {
            current: {
              google: {
                connectionState: "RECONNECT_REQUIRED",
              },
            },
          },
        },
      });

      await user.click(screen.getByText("Reconnect Google Calendar"));

      expect(mockLogin).toHaveBeenCalled();
      expect(mockDispatch).toHaveBeenCalledWith(
        settingsSlice.actions.closeCmdPalette(),
      );
    });

    it("disables the generic action while import is running", async () => {
      render(<DayCmdPalette />, {
        state: {
          settings: { isCmdPaletteOpen: true },
          userMetadata: {
            current: {
              google: {
                connectionState: "IMPORTING",
              },
            },
          },
        },
      });

      expect(
        screen.getByRole("button", { name: "Syncing Google Calendar…" }),
      ).toBeDisabled();
    });

    it("keeps the generic action enabled when sync needs attention", async () => {
      const user = userEvent.setup();
      render(<DayCmdPalette />, {
        state: {
          settings: { isCmdPaletteOpen: true },
          userMetadata: {
            current: {
              google: {
                connectionState: "ATTENTION",
              },
            },
          },
        },
      });

      await user.click(screen.getByText("Repair Google Calendar"));

      expect(SyncApi.importGCal).toHaveBeenCalledWith({ force: true });
    });
  });
});

afterAll(() => {
  mock.restore();
});
