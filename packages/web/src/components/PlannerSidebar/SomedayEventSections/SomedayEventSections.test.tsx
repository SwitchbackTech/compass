import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { type ReactNode } from "react";
import dayjs from "@core/util/date/dayjs";
import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@hello-pangea/dnd", () => ({
  Draggable: () => null,
  DragDropContext: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  Droppable: () => null,
}));

mock.module("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => (
    <div data-testid="sidebar-loading-overlay">Loading&hellip;</div>
  ),
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mock(),
  useAppSelector: () => true,
}));

mock.module(
  "@web/components/PlannerSidebar/draft/context/useSidebarContext",
  () => ({
    useSidebarContext: () => ({
      actions: {
        onDragEnd: mock(),
        onDragStart: mock(),
      },
    }),
  }),
);

mock.module("./SomedayWeekSection/SomedayWeekSection", () => ({
  SomedayWeekSection: () => <section>Week someday events</section>,
}));

mock.module("./SomedayMonthSection/SomedayMonthSection", () => ({
  SomedayMonthSection: () => <section>Month someday events</section>,
}));

const { SomedayEventSections } =
  require("./SomedayEventSections") as typeof import("./SomedayEventSections");

describe("SomedayEventSections", () => {
  it("keeps the planner sidebar stable while someday events refresh", () => {
    render(
      <SomedayEventSections
        calendarDate={dayjs("2026-05-17")}
        viewStart={dayjs("2026-05-17")}
        viewEnd={dayjs("2026-05-23")}
      />,
    );

    expect(screen.getByText("Week someday events")).toBeInTheDocument();
    expect(screen.getByText("Month someday events")).toBeInTheDocument();
    expect(
      screen.queryByTestId("sidebar-loading-overlay"),
    ).not.toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
