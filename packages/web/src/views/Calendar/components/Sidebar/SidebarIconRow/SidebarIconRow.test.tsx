import { screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { render } from "@web/__tests__/utils/render.test.util";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    isUpdateAvailable: false,
  }),
}));

mock.module("@web/components/Tooltip/TooltipWrapper", () => ({
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

const { SidebarIconRow } =
  require("@web/views/Calendar/components/Sidebar/SidebarIconRow") as typeof import("@web/views/Calendar/components/Sidebar/SidebarIconRow");

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
