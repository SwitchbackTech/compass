import dayjs from "dayjs";
import React from "react";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { WeekSection, isCurrentWeek } from "./WeekSection";

// Mock dependencies of WeekSection
jest.mock("../SomedayEvents/SomedayEvents", () => ({
  SomedayEvents: () => <div data-testid="someday-events" />,
}));

jest.mock("@web/components/Text", () => ({
  Text: ({ children, ...props }: any) => (
    <div {...props} data-testid="text">
      {children}
    </div>
  ),
}));

jest.mock("../styled", () => ({
  SidebarSection: ({ children }: any) => <div>{children}</div>,
  SidebarHeader: ({ children }: any) => <div>{children}</div>,
}));

const mockDateCalcs = {} as any;
const mockMeasurements = {} as any;
const mockGridRefs = { mainGridRef: null } as any;

// Helper to generate a week label string based on any date
function getWeekLabel(today: Date, offsetStart = -3, offsetEnd = 3): string {
  const start = new Date(today);
  start.setHours(0, 0, 0, 0);
  start.setDate(today.getDate() + offsetStart);

  const end = new Date(today);
  end.setHours(0, 0, 0, 0);
  end.setDate(today.getDate() + offsetEnd);

  const startStr = `${start.getMonth() + 1}.${start.getDate()}`;
  const endStr = `${end.getMonth() + 1}.${end.getDate()}`;
  return `${startStr} - ${endStr}`;
}

export function getViewStart(offset: number = -3): Date {
  return dayjs().add(offset, "day").startOf("day").toDate();
}

describe("WeekSection Component", () => {
  it("displays 'This Week' if current date is within the week label", () => {
    const today = new Date();
    const weekLabel = getWeekLabel(today, -3, 3); // week span start = today - 3, end = today + 3
    const viewStart = dayjs(getViewStart());

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent("This Week");
  });

  it("displays the weekLabel if current date is before the week", () => {
    const today = new Date();
    const weekLabel = getWeekLabel(today, 10, 17);
    const viewStart = dayjs(getViewStart(10));

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent(weekLabel);
  });

  it("displays the weekLabel if current date is after the week", () => {
    const today = new Date();
    const weekLabel = getWeekLabel(today, -17, -10);
    const viewStart = dayjs(getViewStart(-17));

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent(weekLabel);
  });

  it("handles this week crossing over to a new year", () => {
    const dec29 = new Date(new Date().getFullYear(), 11, 29); // Dec 29
    jest.useFakeTimers().setSystemTime(dec29); // mock Date.now()

    const weekLabel = getWeekLabel(dec29, 0, 6);
    const viewStart = dayjs(dec29);

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent("This Week");

    jest.useRealTimers(); // restore
  });

  it("handles this week crossing over month boundaries", () => {
    const jan30 = new Date(new Date().getFullYear(), 0, 30); // Jan 30
    jest.useFakeTimers().setSystemTime(jan30);

    const weekLabel = getWeekLabel(jan30, 0, 6);
    const viewStart = dayjs(jan30);

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent("This Week");

    jest.useRealTimers();
  });

  it("handles without month label format like '10.4 - 10'", () => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const weekLabel = `${month}.4 - 10`;
    const viewStart = dayjs(new Date(today.getFullYear(), month - 1, 7));

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent("This Week");
  });

  it("handles week immediately before the current week", () => {
    const today = new Date();
    const weekLabel = getWeekLabel(today, -10, -4);
    const viewStart = dayjs(getViewStart(-10));

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent(weekLabel);
  });

  it("handles week immediately after the current week", () => {
    const today = new Date();
    const weekLabel = getWeekLabel(today, 4, 10);
    const viewStart = dayjs(getViewStart(4));

    render(
      <WeekSection
        dateCalcs={mockDateCalcs}
        measurements={mockMeasurements}
        viewStart={viewStart}
        weekLabel={weekLabel}
        gridRefs={mockGridRefs}
      />,
    );

    const heading = screen.getByRole("heading");
    expect(heading).toHaveTextContent(weekLabel);
  });
});

describe("isCurrentWeek function", () => {
  it("returns true when today is inside range", () => {
    const today = new Date(new Date().getFullYear(), 0, 10); // Jan 10
    const label = "1.8 - 1.12";
    const result = isCurrentWeek(label, dayjs(today), today);
    expect(result).toBe(true);
  });

  it("returns false when today is outside range", () => {
    const today = new Date(new Date().getFullYear(), 0, 20); // Jan 20
    const label = "1.8 - 1.12";
    const result = isCurrentWeek(label, dayjs(today), today);
    expect(result).toBe(false);
  });
});
