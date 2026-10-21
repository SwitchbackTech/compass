import { render, screen } from "@testing-library/react";
import { getHourLabels } from "@web/common/utils/datetime/web.date.util";
import { CalendarTimeColumn } from "@web/grid/components/CalendarTimeColumn";
import { mappedHourLabels } from "@web/timezone/mapped-hour-labels";
import { describe, expect, it } from "bun:test";

describe("CalendarTimeColumn", () => {
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
