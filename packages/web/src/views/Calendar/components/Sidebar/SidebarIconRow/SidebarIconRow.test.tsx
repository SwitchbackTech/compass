import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { SyncApi } from "@web/common/apis/sync.api";
import { SidebarIconRow } from "@web/views/Calendar/components/Sidebar/SidebarIconRow";

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

jest.mock("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    isUpdateAvailable: false,
  }),
}));

jest.mock("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({
    children,
    description,
    disabled,
    onClick,
  }: {
    children: ReactNode;
    description?: string;
    disabled?: boolean;
    onClick?: () => void;
  }) => (
    <button
      aria-label={description}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      type="button"
    >
      {children}
    </button>
  ),
}));

describe("SidebarIconRow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows the connect icon action when Google Calendar is not connected", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionStatus: "not_connected",
              syncStatus: "NONE",
            },
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Google Calendar not connected. Click to connect.",
      }),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("Google Calendar not connected"),
    ).toBeInTheDocument();
  });

  it("shows the reconnect icon action when reconnect is required", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionStatus: "reconnect_required",
              syncStatus: "NONE",
            },
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Google Calendar needs reconnecting. Click to reconnect.",
      }),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("Google Calendar needs reconnecting"),
    ).toBeInTheDocument();
  });

  it("disables the sidebar action when Google Calendar is healthy", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionStatus: "connected",
              syncStatus: "HEALTHY",
            },
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Google Calendar connected.",
      }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("Google Calendar connected"),
    ).toBeInTheDocument();
  });

  it("disables the sidebar action while Google Calendar is repairing", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionStatus: "connected",
              syncStatus: "REPAIRING",
            },
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Google Calendar is syncing in the background.",
      }),
    ).toBeDisabled();
    expect(
      screen.getByLabelText("Google Calendar syncing"),
    ).toBeInTheDocument();
  });

  it("clicks through to repair when Google Calendar needs attention", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionStatus: "connected",
              syncStatus: "ATTENTION",
            },
          },
        },
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Google Calendar needs repair. Click to repair.",
      }),
    );

    expect(SyncApi.importGCal).toHaveBeenCalledWith({ force: true });
  });
});
