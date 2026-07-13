import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createPlannerSidebar } from "./PlannerSidebar";
import { describe, expect, it, mock } from "bun:test";

const PlannerSidebar = createPlannerSidebar({
  PlannerAccountSummary: () => <div>Account summary</div>,
  PlannerCalendarList: () => <div>Calendar list</div>,
  PlannerMonthPicker: () => <div>Calendar picker</div>,
  PlannerSidebarActions: () => <div>Sidebar actions</div>,
  ShortcutsOverlay: () => null,
});

const sidebarProps = {
  calendarDate: dayjs("2026-05-12"),
  isShortcutsOpen: false,
  onCloseShortcuts: mock(),
  onToggleShortcuts: mock(),
  onSelectDate: mock(),
  shortcutSections: [],
};

describe("PlannerSidebar", () => {
  it("renders the core sidebar sections", () => {
    render(<PlannerSidebar {...sidebarProps} />);

    expect(screen.getByText("Calendar picker")).toBeTruthy();
    expect(screen.getByText("Calendar list")).toBeTruthy();
    expect(screen.getByText("Account summary")).toBeTruthy();
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });
});
