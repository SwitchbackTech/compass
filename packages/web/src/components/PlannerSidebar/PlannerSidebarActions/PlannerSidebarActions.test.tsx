import { render, screen } from "@testing-library/react";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/common/hooks/useVersionCheck", () => ({
  useVersionCheck: () => ({
    isUpdateAvailable: false,
  }),
}));

const { PlannerSidebarActions } =
  require("@web/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions") as typeof import("@web/components/PlannerSidebar/PlannerSidebarActions/PlannerSidebarActions");

describe("PlannerSidebarActions", () => {
  it("does not render the background import spinner in the sidebar", () => {
    const { wrapper } = createStoreWrapper();

    render(
      <PlannerSidebarActions
        isShortcutsOpen={false}
        onToggleShortcuts={mock()}
      />,
      { wrapper },
    );

    expect(
      screen.queryByRole("button", {
        name: "Syncing Google Calendar in the background.",
      }),
    ).not.toBeInTheDocument();
  });

  it("labels the shortcuts button as a close action when shortcuts are open", () => {
    const { wrapper } = createStoreWrapper();

    render(
      <PlannerSidebarActions
        isShortcutsOpen={true}
        onToggleShortcuts={mock()}
      />,
      { wrapper },
    );

    expect(
      screen.getByRole("button", { name: "Close shortcuts" }),
    ).toBeInTheDocument();
  });
});
