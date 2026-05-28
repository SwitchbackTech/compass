import {
  DATA_CALENDAR_TIMED_GRID_ROW,
  ID_GRID_MAIN,
} from "@web/common/constants/web.constants";
import { openEventFormCreateEvent } from "@web/views/Day/interaction/dayCalendarFocus.util";
import { afterEach, describe, expect, it, mock } from "bun:test";

describe("openEventFormCreateEvent", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("starts create-event from the timed grid row surface", () => {
    const timedGrid = document.createElement("div");
    const row = document.createElement("div");

    timedGrid.id = ID_GRID_MAIN;
    row.setAttribute(DATA_CALENDAR_TIMED_GRID_ROW, "true");
    timedGrid.append(row);
    document.body.append(timedGrid);

    const rowMouseDown = mock();
    const gridMouseDown = mock();
    row.addEventListener("mousedown", rowMouseDown);
    timedGrid.addEventListener("mousedown", gridMouseDown);

    openEventFormCreateEvent();

    expect(rowMouseDown).toHaveBeenCalledTimes(1);
    expect(gridMouseDown).toHaveBeenCalledTimes(1);
  });
});
