import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { describe, expect, it, mock } from "bun:test";

mock.module("../SomedayEvents/SomedayEvents", () => ({
  SomedayEvents: () => <div>Someday events</div>,
}));

mock.module("@web/views/Week/hooks/useToday", () => ({
  useToday: () => ({ today: dayjs("2026-05-12"), todayIndex: 2 }),
}));

const { SomedayMonthSection } =
  require("./SomedayMonthSection") as typeof import("./SomedayMonthSection");

describe("SomedayMonthSection", () => {
  it("labels the selected month even when the week starts in the previous month", () => {
    render(
      <SomedayMonthSection
        monthDate={dayjs("2026-06-01")}
        viewStart={dayjs("2026-05-31")}
      />,
    );

    expect(screen.getByRole("heading", { name: "June" })).toBeInTheDocument();
  });
});
