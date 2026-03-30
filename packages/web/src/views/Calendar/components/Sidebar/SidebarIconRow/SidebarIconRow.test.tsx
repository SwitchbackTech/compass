import type { ReactNode } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/utils/render.test.util";
import { SyncApi } from "@web/common/apis/sync.api";
import { SidebarIconRow } from "@web/views/Calendar/components/Sidebar/SidebarIconRow";

const mockLogin = jest.fn();

jest.mock("@web/auth/hooks/google/useGoogleAuth/useGoogleAuth", () => ({
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

jest.mock(
  "@web/views/Calendar/components/Sidebar/SidebarIconRow/StatusDotPopover",
  () => ({
    StatusDotPopover: ({
      children,
      title,
      repairLabel,
      onRepair,
      isRepairing,
    }: {
      children: ReactNode;
      title: string;
      repairLabel: string;
      onRepair: () => void;
      isRepairing: boolean;
    }) => (
      <div>
        {children}
        <div role="dialog" aria-label={title}>
          <button
            aria-label={
              isRepairing ? "We're repairing your calendar" : repairLabel
            }
            disabled={isRepairing}
            onClick={isRepairing ? undefined : onRepair}
            type="button"
          >
            {repairLabel}
          </button>
        </div>
      </div>
    ),
  }),
);

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
              connectionState: "NOT_CONNECTED",
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
      screen.getByRole("status", {
        name: "Google Calendar not connected. Click to connect.",
      }),
    ).toBeInTheDocument();
  });

  it("shows the reconnect icon action when reconnect is required", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionState: "RECONNECT_REQUIRED",
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
      screen.getByRole("status", {
        name: "Google Calendar needs reconnecting. Click to reconnect.",
      }),
    ).toBeInTheDocument();
  });

  it("disables the sidebar action when Google Calendar is healthy", () => {
    render(<SidebarIconRow />, {
      state: {
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
      screen.getByRole("button", {
        name: "Google Calendar connected.",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("status", {
        name: "Google Calendar connected.",
      }),
    ).toBeInTheDocument();
  });

  it("disables the sidebar action while Google Calendar is importing", () => {
    render(<SidebarIconRow />, {
      state: {
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
      screen.getByRole("button", {
        name: "Google Calendar is syncing in the background.",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("status", {
        name: "Google Calendar is syncing in the background.",
      }),
    ).toBeInTheDocument();
  });

  it("shows the background import spinner while Google Calendar is importing", () => {
    render(<SidebarIconRow />, {
      state: {
        sync: {
          importGCal: {
            isProcessing: true,
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "Importing your calendar events in the background",
      }),
    ).toBeInTheDocument();
  });

  it("shows the attention dialog when Google Calendar needs repair", () => {
    render(<SidebarIconRow />, {
      state: {
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
      screen.getByRole("dialog", { name: "Calendar sync needs repair" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("status", {
        name: "Google Calendar needs repair. Click to repair.",
      }),
    ).toBeInTheDocument();
  });

  it("calls repair when the Repair button is clicked in the attention dialog", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionState: "ATTENTION",
            },
          },
        },
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Repair" }));

    expect(SyncApi.importGCal).toHaveBeenCalledWith({ force: true });
  });

  it("shows a disabled repair button while a repair is active", () => {
    render(<SidebarIconRow />, {
      state: {
        userMetadata: {
          current: {
            google: {
              connectionState: "ATTENTION",
            },
          },
        },
        sync: {
          importGCal: {
            isRepairing: true,
          },
        },
      },
    });

    expect(
      screen.getByRole("button", {
        name: "We're repairing your calendar",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("status", {
        name: "Google Calendar needs repair. Click to repair.",
      }),
    ).toBeInTheDocument();
  });
});
