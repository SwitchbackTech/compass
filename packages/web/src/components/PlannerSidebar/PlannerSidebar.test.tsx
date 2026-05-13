import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("./PlannerMonthPicker/PlannerMonthPicker", () => ({
  PlannerMonthPicker: () => <div>Calendar picker</div>,
}));

mock.module("./PlannerAccountSummary/PlannerAccountSummary", () => ({
  PlannerAccountSummary: () => <div>Account summary</div>,
}));

mock.module("./PlannerSidebarActions/PlannerSidebarActions", () => ({
  PlannerSidebarActions: () => <div>Sidebar actions</div>,
}));

mock.module("./ShortcutsOverlay/ShortcutsOverlay", () => ({
  ShortcutsOverlay: () => null,
}));

mock.module("./SomedayEventSections/SomedayEventSections", () => ({
  SomedayEventSections: () => <div>Week and month planning buckets</div>,
}));

const { PlannerSidebar } =
  require("./PlannerSidebar") as typeof import("./PlannerSidebar");

const renderSidebar = (props?: { showSomedayEventSections?: boolean }) => {
  render(
    <PlannerSidebar
      calendarDate={dayjs("2026-05-12")}
      isShortcutsOpen={false}
      onCloseShortcuts={mock()}
      onToggleShortcuts={mock()}
      onSelectDate={mock()}
      shortcutSections={[]}
      viewEnd={dayjs("2026-05-16")}
      viewStart={dayjs("2026-05-10")}
      {...props}
    />,
  );
};

describe("PlannerSidebar", () => {
  it("shows Someday event sections by default", () => {
    renderSidebar();

    expect(screen.getByRole("region", { name: "Someday events" })).toBeTruthy();
    expect(screen.getByText("Week and month planning buckets")).toBeTruthy();
  });

  it("hides Someday event sections when requested", () => {
    renderSidebar({ showSomedayEventSections: false });

    expect(screen.queryByRole("region", { name: "Someday events" })).toBeNull();
    expect(screen.queryByText("Week and month planning buckets")).toBeNull();
    expect(screen.getByText("Calendar picker")).toBeTruthy();
    expect(screen.getByText("Account summary")).toBeTruthy();
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });
});

afterAll(() => {
  mock.restore();
});
