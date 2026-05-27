import { cleanup, render, screen, within } from "@testing-library/react";
import { type RefCallback } from "react";
import { ThemeProvider } from "styled-components";
import dayjs from "@core/util/date/dayjs";
import { theme } from "@web/common/styles/theme";
import { afterEach, describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";
import { CalendarGrid } from "./CalendarGrid";

const createGridRefs = () => ({
  allDayColumnsRef: { current: null },
  allDayRef: mock() as RefCallback<HTMLDivElement>,
  allDayRowRef: mock() as RefCallback<HTMLDivElement>,
  mainGridElementRef: mock() as RefCallback<HTMLDivElement>,
  mainGridRef: { current: null },
  timedColumnsElementRef: mock() as RefCallback<HTMLDivElement>,
  timedColumnsRef: { current: null },
});

const renderGrid = (count: number) =>
  render(
    <ThemeProvider theme={theme}>
      <CalendarGrid
        allDayEventsLayer={<div data-testid="all-day-events-layer" />}
        gridRefs={createGridRefs()}
        onAllDayMouseDown={mock()}
        onTimedMouseDown={mock()}
        timedEventsLayer={<div data-testid="timed-events-layer" />}
        today={dayjs("2026-05-20T00:00:00.000")}
        visibleDates={Array.from({ length: count }, (_, index) => ({
          date: dayjs("2026-05-18T00:00:00.000").add(index, "day"),
          key: `date-${index}`,
        }))}
      />
    </ThemeProvider>,
  );

afterEach(() => {
  cleanup();
});

describe("CalendarGrid", () => {
  it("renders seven visible date columns for Week", () => {
    renderGrid(7);

    const timedGrid = screen.getByRole("region", { name: "Timed events grid" });
    expect(within(timedGrid).getAllByRole("columnheader")).toHaveLength(7);
  });

  it("renders one visible date column for Day", () => {
    renderGrid(1);

    const timedGrid = screen.getByRole("region", { name: "Timed events grid" });
    expect(within(timedGrid).getAllByRole("columnheader")).toHaveLength(1);
  });

  it("keeps explicit event layers on their surfaces", () => {
    renderGrid(1);

    expect(
      screen.getByRole("region", { name: "All-day events" }),
    ).toContainElement(screen.getByTestId("all-day-events-layer"));
    expect(
      screen.getByRole("region", { name: "Timed events grid" }),
    ).toContainElement(screen.getByTestId("timed-events-layer"));
  });

  it("passes the all-day row count to the shared all-day surface", () => {
    render(
      <ThemeProvider theme={theme}>
        <CalendarGrid
          allDayEventsLayer={<div />}
          allDayGridOffsetTopPx={123}
          allDayRowsCount={3}
          gridRefs={createGridRefs()}
          onAllDayMouseDown={mock()}
          onTimedMouseDown={mock()}
          timedEventsLayer={<div />}
          today={dayjs("2026-05-20T00:00:00.000")}
          visibleDates={[
            {
              date: dayjs("2026-05-20T00:00:00.000"),
              key: "date-0",
            },
          ]}
        />
      </ThemeProvider>,
    );

    expect(
      getComputedStyle(screen.getByRole("region", { name: "All-day events" }))
        .height,
    ).toContain("6 *");
  });
});
