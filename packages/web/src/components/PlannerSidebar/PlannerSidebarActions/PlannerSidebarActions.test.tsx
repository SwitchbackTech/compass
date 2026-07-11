import { render, screen } from "@testing-library/react";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { afterAll, describe, expect, it, mock } from "bun:test";

// mock.module is process-wide and not reliably restorable, so the real hook
// is captured up front and a flag (flipped off in afterAll) decides which
// implementation runs on each call. This lets useVersionCheck.test.ts (which
// sits alongside this file and imports the real hook) get the real
// implementation back instead of permanently inheriting this file's stub.
const actualUseVersionCheck = (
  await import(
    "@web/components/PlannerSidebar/PlannerSidebarActions/useVersionCheck"
  )
).useVersionCheck;
let isVersionCheckMocked = true;

mock.module(
  "@web/components/PlannerSidebar/PlannerSidebarActions/useVersionCheck",
  () => ({
    useVersionCheck: () =>
      isVersionCheckMocked
        ? { isUpdateAvailable: false }
        : actualUseVersionCheck(),
  }),
);

afterAll(() => {
  isVersionCheckMocked = false;
});

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
