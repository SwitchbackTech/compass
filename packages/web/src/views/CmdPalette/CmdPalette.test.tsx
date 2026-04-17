import { fireEvent, screen, waitFor } from "@testing-library/react";
import { act, type ReactNode } from "react";
import dayjs from "@core/util/date/dayjs";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { afterAll } from "bun:test";

const mockGoToToday = mock();
const mockImportGCal = mock();
const mockLogin = mock();
const mockScrollToNow = mock();
const mockSuperTokensInit = mock();
const mockRecipeInit = mock(() => ({}));

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

mock.module("react-cmdk", () => {
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
  CommandPalette.ListItem = ({ children, disabled, onClick }: any) => (
    <button disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
  CommandPalette.FreeSearchAction = () => <div>No results</div>;

  return {
    __esModule: true,
    default: CommandPalette,
    filterItems: (items: unknown) => items,
    getItemIndex: () => 0,
  };
});

mock.module("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
}));

mock.module("@web/auth/google/hooks/useGoogleAuth/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    login: mockLogin,
  }),
}));

mock.module("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: ReactNode }) => children,
}));

mock.module("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: mockImportGCal,
  },
}));

const { SyncApi } =
  require("@web/common/apis/sync.api") as typeof import("@web/common/apis/sync.api");
const { render } =
  require("@web/__tests__/__mocks__/mock.render") as typeof import("@web/__tests__/__mocks__/mock.render");
const { default: CmdPalette } =
  require("@web/views/CmdPalette/CmdPalette") as typeof import("@web/views/CmdPalette/CmdPalette");

const baseProps = {
  today: dayjs(),
  isCurrentWeek: true,
  startOfView: dayjs(),
  endOfView: dayjs(),
  scrollUtil: {
    scrollToNow: mockScrollToNow,
  },
  util: {
    goToToday: mockGoToToday,
  },
} as const;

describe("CmdPalette", () => {
  beforeEach(() => {
    mockGoToToday.mockClear();
    mockImportGCal.mockClear();
    mockLogin.mockClear();
    mockRecipeInit.mockClear();
    mockScrollToNow.mockClear();
    mockSuperTokensInit.mockClear();

    mockImportGCal.mockResolvedValue(undefined);
  });

  it("shows the generic Google action when metadata is missing", () => {
    render(<CmdPalette {...baseProps} />, {
      state: { settings: { isCmdPaletteOpen: true } },
    });

    expect(
      screen.getByRole("button", { name: /connect google calendar/i }),
    ).toBeEnabled();
  });

  it("disables the generic Google action when Google Calendar is connected", () => {
    render(<CmdPalette {...baseProps} />, {
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

  it("starts a forced repair when Google Calendar needs repair", async () => {
    render(<CmdPalette {...baseProps} />, {
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

    act(() =>
      fireEvent.click(
        screen.getByRole("button", { name: "Repair Google Calendar" }),
      ),
    );

    await waitFor(() =>
      expect(SyncApi.importGCal).toHaveBeenCalledWith({ force: true }),
    );
  });
});

afterAll(() => {
  mock.restore();
});
