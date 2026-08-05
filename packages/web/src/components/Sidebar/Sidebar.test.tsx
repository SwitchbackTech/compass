import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import { createSidebar } from "./Sidebar";
import { describe, expect, it, mock } from "bun:test";

const Sidebar = createSidebar({
  CalendarList: () => <div>Calendar list</div>,
  MonthPicker: () => <div>Calendar picker</div>,
  SidebarActions: () => <div>Sidebar actions</div>,
  ShortcutsOverlay: () => null,
  TasksRemovalNotice: () => null,
  UpNextCard: () => <div>Up next</div>,
});

const sidebarProps = {
  calendarDate: dayjs("2026-05-12"),
  isShortcutsOpen: false,
  onCloseShortcuts: mock(),
  onToggleShortcuts: mock(),
  onSelectDate: mock(),
  shortcutSections: [],
};

describe("Sidebar", () => {
  it("renders the core sidebar sections", () => {
    const { wrapper } = createStoreWrapper();
    render(<Sidebar {...sidebarProps} />, { wrapper });

    expect(screen.getByText("Calendar picker")).toBeTruthy();
    expect(screen.getByText("Calendar list")).toBeTruthy();
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });

  it("shows event details only while the parent says they are open", () => {
    const { wrapper } = createStoreWrapper();
    const { rerender } = render(
      <Sidebar {...sidebarProps} eventDetails={<div>Event details</div>} />,
      { wrapper },
    );

    expect(screen.queryByText("Event details")).toBeNull();
    expect(screen.getByText("Calendar picker")).toBeTruthy();

    rerender(
      <Sidebar
        {...sidebarProps}
        eventDetails={<div>Event details</div>}
        isEventDetailsOpen
      />,
    );

    expect(screen.getByText("Event details")).toBeTruthy();
    expect(screen.queryByText("Calendar picker")).toBeNull();
  });
});
