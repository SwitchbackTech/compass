import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createPlannerSidebar } from "./PlannerSidebar";
import { describe, expect, it, mock } from "bun:test";

const PlannerSidebar = createPlannerSidebar({
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
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });

  it("shows event details only while the parent says they are open", () => {
    const { rerender } = render(
      <PlannerSidebar
        {...sidebarProps}
        eventDetails={<div>Event details</div>}
      />,
    );

    expect(screen.queryByText("Event details")).toBeNull();
    expect(screen.getByText("Calendar picker")).toBeTruthy();

    rerender(
      <PlannerSidebar
        {...sidebarProps}
        eventDetails={<div>Event details</div>}
        isEventDetailsOpen
      />,
    );

    expect(screen.getByText("Event details")).toBeTruthy();
    expect(screen.queryByText("Calendar picker")).toBeNull();
  });
});
