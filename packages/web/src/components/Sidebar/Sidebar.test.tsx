import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { createStoreWrapper } from "@web/__tests__/render-with-store";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { draftActions } from "@web/events/stores/draft.store";
import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

// mock.module is process-wide and not reliably restorable, so - as in
// SidebarStatusBar.test.tsx - each real component is captured up front and a
// flag (flipped in afterAll) decides which one runs, keeping the mocks
// scoped to this file's tests.
const actual = {
  CalendarList: (await import("./CalendarList/CalendarList")).CalendarList,
  MonthPicker: (await import("./MonthPicker/MonthPicker")).MonthPicker,
  SidebarActions: (await import("./SidebarActions/SidebarActions"))
    .SidebarActions,
  ShortcutsOverlay: (await import("./ShortcutsOverlay/ShortcutsOverlay"))
    .ShortcutsOverlay,
  TasksRemovalNotice: (await import("./TasksRemovalNotice/TasksRemovalNotice"))
    .TasksRemovalNotice,
  UpNextCard: (await import("./UpNextCard/UpNextCard")).UpNextCard,
};
let isMocked = true;

mock.module("./CalendarList/CalendarList", () => ({
  CalendarList: (...args: Parameters<typeof actual.CalendarList>) =>
    isMocked ? <div>Calendar list</div> : actual.CalendarList(...args),
}));
mock.module("./MonthPicker/MonthPicker", () => ({
  MonthPicker: (...args: Parameters<typeof actual.MonthPicker>) =>
    isMocked ? <div>Calendar picker</div> : actual.MonthPicker(...args),
}));
mock.module("./SidebarActions/SidebarActions", () => ({
  SidebarActions: (...args: Parameters<typeof actual.SidebarActions>) =>
    isMocked ? <div>Sidebar actions</div> : actual.SidebarActions(...args),
}));
mock.module("./ShortcutsOverlay/ShortcutsOverlay", () => ({
  ShortcutsOverlay: (...args: Parameters<typeof actual.ShortcutsOverlay>) =>
    isMocked ? null : actual.ShortcutsOverlay(...args),
}));
mock.module("./TasksRemovalNotice/TasksRemovalNotice", () => ({
  TasksRemovalNotice: (
    ...args: Parameters<typeof actual.TasksRemovalNotice>
  ) => (isMocked ? null : actual.TasksRemovalNotice(...args)),
}));
mock.module("./UpNextCard/UpNextCard", () => ({
  UpNextCard: (...args: Parameters<typeof actual.UpNextCard>) =>
    isMocked ? <div>Up next</div> : actual.UpNextCard(...args),
}));

afterAll(() => {
  isMocked = false;
});

const sidebarModuleUrl = new URL(
  `./Sidebar.tsx?test=${Math.random().toString(36).slice(2)}`,
  import.meta.url,
);
const { Sidebar } = (await import(
  sidebarModuleUrl.href
)) as typeof import("./Sidebar");

const sidebarProps = {
  calendarDate: dayjs("2026-05-12"),
  onSelectDate: mock(),
  shortcutSections: [],
};

describe("Sidebar", () => {
  afterEach(() => {
    draftActions.discard();
  });

  it("renders the core sidebar sections", () => {
    const { wrapper } = createStoreWrapper();
    render(<Sidebar {...sidebarProps} />, { wrapper });

    expect(screen.getByText("Calendar picker")).toBeTruthy();
    expect(screen.getByText("Calendar list")).toBeTruthy();
    expect(screen.getByText("Sidebar actions")).toBeTruthy();
  });

  it("shows event details only while the draft store says the form is open", () => {
    const { wrapper } = createStoreWrapper();
    const { rerender } = render(
      <Sidebar {...sidebarProps} eventDetails={<div>Event details</div>} />,
      { wrapper },
    );

    expect(screen.queryByText("Event details")).toBeNull();
    expect(screen.getByText("Calendar picker")).toBeTruthy();

    draftActions.startGridDraft({
      activity: "gridClick",
      draft: createGridEventDraft(
        timedGridSchedule(
          new Date("2026-05-12T09:00:00.000Z"),
          new Date("2026-05-12T10:00:00.000Z"),
        ),
      ),
    });
    draftActions.setFormOpen(true);
    rerender(
      <Sidebar {...sidebarProps} eventDetails={<div>Event details</div>} />,
    );

    expect(screen.getByText("Event details")).toBeTruthy();
    expect(screen.queryByText("Calendar picker")).toBeNull();
  });
});
