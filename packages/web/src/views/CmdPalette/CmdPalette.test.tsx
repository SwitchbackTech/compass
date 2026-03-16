import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { SyncApi } from "@web/common/apis/sync.api";
import CmdPalette from "@web/views/CmdPalette/CmdPalette";

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

jest.mock("@web/common/utils/dom/event-target-visibility.util", () => ({
  onEventTargetVisibility: (cb: () => void) => () => cb(),
}));

const mockLogin = jest.fn();
jest.mock("@web/auth/hooks/oauth/useGoogleAuth", () => ({
  useGoogleAuth: () => ({
    login: mockLogin,
  }),
}));

jest.mock("@web/common/apis/sync.api", () => ({
  SyncApi: {
    importGCal: jest.fn().mockResolvedValue(undefined),
  },
}));

const baseProps = {
  today: dayjs(),
  isCurrentWeek: true,
  startOfView: dayjs(),
  endOfView: dayjs(),
  scrollUtil: {
    scrollToNow: jest.fn(),
  },
  util: {
    goToToday: jest.fn(),
  },
} as const;

describe("CmdPalette", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
              connectionStatus: "CONNECTED",
              syncStatus: "HEALTHY",
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
              connectionStatus: "CONNECTED",
              syncStatus: "ATTENTION",
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
