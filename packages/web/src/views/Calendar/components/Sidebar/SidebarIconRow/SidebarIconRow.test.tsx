import type { ReactNode } from "react";
import { screen } from "@testing-library/react";
import { render } from "@web/__tests__/utils/render.test.util";
import { SidebarIconRow } from "@web/views/Calendar/components/Sidebar/SidebarIconRow";

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
});
