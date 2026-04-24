import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { GRID_MARGIN_LEFT } from "@web/views/Calendar/layout.constants";
import { DayLabels } from "./DayLabels";
import { describe, expect, it } from "bun:test";

describe("DayLabels", () => {
  it("uses the same left gutter as the week grid", () => {
    const startOfView = dayjs("2026-04-19");
    const weekDays = Array.from({ length: 7 }, (_, index) =>
      startOfView.add(index, "day"),
    );

    const { container } = render(
      <DayLabels
        startOfView={startOfView}
        today={dayjs("2026-04-24")}
        week={startOfView.week()}
        weekDays={weekDays}
      />,
    );

    const labelRow = container.firstElementChild as HTMLElement;

    expect(labelRow.style.paddingLeft).toBe(`${GRID_MARGIN_LEFT}px`);
    expect(labelRow.style.width).toBe("100%");
    expect(labelRow.style.boxSizing).toBe("border-box");
  });
});
