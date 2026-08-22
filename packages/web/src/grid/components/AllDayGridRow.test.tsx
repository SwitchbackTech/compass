import { render, screen } from "@testing-library/react";
import dayjs from "@core/util/date/dayjs";
import { ALL_DAY_COLUMN_TINT_PERCENT } from "@web/grid/utils/allDayColumnTint.util";
import { AllDayGridRow } from "./AllDayGridRow";
import { describe, expect, it } from "bun:test";

const today = dayjs("2026-04-24");

describe("AllDayGridRow", () => {
  it("applies the all-day tint wash on columns that carry a tint color", () => {
    const tint = "#039BE5";
    render(
      <AllDayGridRow
        allDayColumnsRef={() => {}}
        allDayRowRef={() => {}}
        eventsLayer={null}
        visibleDates={[
          {
            date: today,
            key: "today",
            allDayTintColor: tint,
            surfaceLabel: "Tinted all-day column",
          },
        ]}
      />,
    );

    const column = screen.getByRole("columnheader", {
      name: "Tinted all-day column",
    });
    expect(column.getAttribute("data-all-day-tint")).toBe("true");
    expect(column.style.getPropertyValue("--column-all-day-tint")).toBe(tint);
    // jsdom may normalize the hex inside color-mix to rgb(...).
    expect(column.style.backgroundColor).toContain("color-mix(in srgb,");
    expect(column.style.backgroundColor).toContain(
      `${ALL_DAY_COLUMN_TINT_PERCENT}%`,
    );
  });
});
