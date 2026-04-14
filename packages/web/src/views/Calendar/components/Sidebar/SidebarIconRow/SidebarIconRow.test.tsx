import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
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
  it("does not render the background import spinner in the sidebar", () => {
    render(<SidebarIconRow />);

    expect(
      screen.queryByRole("button", {
        name: "Syncing Google Calendar in the background.",
      }),
    ).not.toBeInTheDocument();
  });
});
