import { render, within } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { DATA_TIMED_GRID_ROW } from "@web/common/constants/web.constants";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { TimedGrid } from "@web/grid/components/TimedGrid";
import { describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";

describe("hour gutter vs timed row alignment", () => {
  const denver = "America/Denver";
  const today = dayjs.tz("2026-10-21T12:00", denver);
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = dayjs.tz("2026-10-18T00:00", denver).add(index, "day");
    return { date, key: date.format("YYYY-MM-DD") };
  });

  it("places each gutter label at the same offset as its timed grid row", () => {
    render(
      <TimedGrid
        eventsLayer={null}
        timedColumnsRef={() => {}}
        timedGridRef={() => {}}
        today={today}
        visibleDates={weekDays}
      />,
    );

    const grid = document.getElementById("mainGrid");
    expect(grid).toBeTruthy();
    const labels = getHourLabels(true, weekDays[3]?.date ?? today, denver);
    const rows = grid?.querySelectorAll(`[${DATA_TIMED_GRID_ROW}="true"]`);
    expect(rows?.length).toBe(labels.length);

    for (let index = 0; index < labels.length; index += 1) {
      const label = labels[index] ?? "";
      const labelEl = within(grid as HTMLElement).getAllByText(label)[0];
      const row = rows?.[index];
      expect(labelEl, `missing label ${label}`).toBeTruthy();
      expect(row, `missing row for ${label}`).toBeTruthy();
      expect(labelEl.getBoundingClientRect().top).toBeCloseTo(
        row?.getBoundingClientRect().top ?? 0,
        0,
      );
    }
  });
});
