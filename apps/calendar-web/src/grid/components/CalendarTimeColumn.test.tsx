import { render, screen } from "@testing-library/react";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { CalendarTimeColumn } from "@web/grid/components/CalendarTimeColumn";
import { GRID_TIME_COLUMN_WIDTH } from "@web/grid/grid.constants";
import {
  resetEffectiveTimeZoneStoreForTests,
  setPinnedTimeZone,
} from "@web/timezone/effective-timezone.store";
import { mappedHourLabels } from "@web/timezone/mapped-hour-labels";
import {
  resetTimeTravelStoreForTests,
  setTimeTravelZone,
} from "@web/timezone/time-travel.store";
import { afterEach, describe, expect, it } from "bun:test";

describe("CalendarTimeColumn", () => {
  afterEach(() => {
    resetTimeTravelStoreForTests();
    resetEffectiveTimeZoneStoreForTests();
  });

  it("lays out secondary and primary hour columns side by side", () => {
    const at = new Date("2026-10-21T12:00:00-06:00");
    setPinnedTimeZone("America/Denver");
    setTimeTravelZone("UTC");

    const { container } = render(<CalendarTimeColumn at={at} />);
    const gutter = container.querySelector('[aria-hidden="true"]');
    expect(gutter).not.toBeNull();
    expect(gutter?.className).toContain("flex-row");
    expect((gutter as HTMLElement).style.width).toBe(
      `${GRID_TIME_COLUMN_WIDTH * 2}px`,
    );

    const columns = gutter?.querySelectorAll(":scope > div");
    expect(columns?.length).toBe(2);
    for (const column of Array.from(columns ?? [])) {
      expect((column as HTMLElement).style.width).toBe(
        `${GRID_TIME_COLUMN_WIDTH}px`,
      );
    }
  });

  it("uses civil hour labels that match the timed grid on Denver fall-back Sunday", () => {
    const at = new Date("2026-11-01T12:00:00-06:00");
    const expected = getHourLabels(true, at, "America/Denver");

    render(<CalendarTimeColumn at={at} />);

    for (const label of expected) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("1 AM")).toHaveLength(1);

    const mapped = mappedHourLabels("America/Denver", "America/Denver", at);
    expect(mapped.length).not.toBe(expected.length);
  });
});
