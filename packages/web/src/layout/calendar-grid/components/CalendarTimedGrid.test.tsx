import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "@core/util/date/dayjs";
import { CalendarTimedGrid } from "./CalendarTimedGrid";
import { describe, expect, it } from "bun:test";

const today = dayjs("2026-04-24T12:00:00.000Z");

describe("CalendarTimedGrid", () => {
  it("is reachable by Tab, not just by mouse click", async () => {
    const user = userEvent.setup();

    render(
      <div>
        <button type="button">Before</button>
        <CalendarTimedGrid
          eventsLayer={null}
          onMouseDown={() => {}}
          timedColumnsRef={() => {}}
          timedGridRef={() => {}}
          today={today}
          visibleDates={[{ date: today, key: "today" }]}
        />
      </div>,
    );

    const grid = screen.getByRole("region", { name: "Timed events grid" });

    await user.tab();
    expect(screen.getByRole("button", { name: "Before" })).toHaveFocus();

    await user.tab();
    expect(grid).toHaveFocus();
  });
});
