import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    isUpdateAvailable: false,
  }),
}));

mock.module("@web/components/Tooltip/TooltipWrapper", () => ({
  TooltipWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mock(),
  useAppSelector: () => false,
}));

const { PlannerSidebarActions } =
  require("@web/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions") as typeof import("@web/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions");

describe("PlannerSidebarActions", () => {
  it("does not render the background import spinner in the sidebar", () => {
    render(
      <PlannerSidebarActions
        isShortcutsOpen={false}
        onToggleShortcuts={mock()}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Syncing Google Calendar in the background.",
      }),
    ).not.toBeInTheDocument();
  });

  it("labels the shortcuts button as a close action when shortcuts are open", () => {
    render(
      <PlannerSidebarActions
        isShortcutsOpen={true}
        onToggleShortcuts={mock()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Close shortcuts" }),
    ).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
