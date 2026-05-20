import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("@web/components/AbsoluteOverflowLoader", () => ({
  AbsoluteOverflowLoader: () => (
    <div data-testid="sidebar-loading-overlay">Loading&hellip;</div>
  ),
}));

mock.module("@web/store/store.hooks", () => ({
  useAppDispatch: () => mock(),
  useAppSelector: () => true,
}));

mock.module("./SomedayWeekSection/SomedayWeekSection", () => ({
  SomedayWeekSection: () => <section>Week someday events</section>,
}));

mock.module("./SomedayEvents/SomedayEvents", () => ({
  SomedayEvents: () => <section>Someday events</section>,
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
    expect(
      screen.getByRole("heading", { name: "This Month" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Someday events")).toBeInTheDocument();
    expect(
      screen.queryByTestId("sidebar-loading-overlay"),
    ).not.toBeInTheDocument();
  });

  it("labels the selected month when the visible week starts in the previous month", () => {
    render(
      <SomedayEventSections
        calendarDate={dayjs("2026-06-01")}
        viewStart={dayjs("2026-05-31")}
        viewEnd={dayjs("2026-06-06")}
      />,
    );

    expect(screen.getByRole("heading", { name: "June" })).toBeInTheDocument();
  });
});

afterAll(() => {
  mock.restore();
});
