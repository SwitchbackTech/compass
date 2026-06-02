import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createPlannerSidebar } from "./PlannerSidebar";
import { describe, expect, it, mock } from "bun:test";

const PlannerSidebar = createPlannerSidebar({
  PlannerAccountSummary: () => <div>Account summary</div>,
  PlannerMonthPicker: () => <div>Calendar picker</div>,
  PlannerSidebarActions: () => <div>Sidebar actions</div>,
  ShortcutsOverlay: () => null,
  SomedayEventSections: () => <div>Week and month planning buckets</div>,
});

const sidebarProps = {
  calendarDate: dayjs("2026-05-12"),
  isShortcutsOpen: false,
  onCloseShortcuts: mock(),
  onToggleShortcuts: mock(),
  onSelectDate: mock(),
  shortcutSections: [],
  viewEnd: dayjs("2026-05-16"),
  viewStart: dayjs("2026-05-10"),
};

describe("PlannerSidebar", () => {
  it("shows Someday event sections by default", () => {
    render(<PlannerSidebar {...sidebarProps} />);

    expect(screen.getByRole("region", { name: "Someday events" })).toBeTruthy();
    expect(screen.getByText("Week and month planning buckets")).toBeTruthy();
  });

  it("hides Someday event sections when requested", () => {
    render(
      <PlannerSidebar {...sidebarProps} showSomedayEventSections={false} />,
    );

    expect(screen.queryByRole("region", { name: "Someday events" })).toBeNull();
    expect(screen.queryByText("Week and month planning buckets")).toBeNull();
    expect(screen.getByText("Calendar picker")).toBeTruthy();
    expect(screen.getByText("Account summary")).toBeTruthy();
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });
});
