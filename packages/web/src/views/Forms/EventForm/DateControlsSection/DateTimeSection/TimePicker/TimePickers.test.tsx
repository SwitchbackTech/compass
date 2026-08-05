import { render, screen } from "@testing-library/react";
import { useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { getTimeOptionByValue } from "@web/common/utils/datetime/web.date.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { TimePickers } from "./TimePickers";
import { describe, expect, it } from "bun:test";

const START_DATE = new Date("2026-04-24T14:00:00.000Z");
const END_DATE = new Date("2026-04-24T15:00:00.000Z");

function Harness() {
  const [draft, setDraft] = useState<GridEventDraft>(
    createGridEventDraft(timedGridSchedule(START_DATE, END_DATE)),
  );
  const [startTime, setStartTime] = useState(
    getTimeOptionByValue(dayjs(START_DATE)),
  );
  const [endTime, setEndTime] = useState(getTimeOptionByValue(dayjs(END_DATE)));

  return (
    <TimePickers
      draft={draft}
      endTime={endTime}
      selectedEndDate={END_DATE}
      selectedStartDate={START_DATE}
      setDraft={setDraft}
      setEndTime={setEndTime}
      setStartTime={setStartTime}
      startTime={startTime}
    />
  );
}

describe("TimePickers", () => {
  it("gives the start and end pickers distinct accessible names", () => {
    render(<Harness />);

    const start = screen.getByRole("combobox", { name: "Start time" });
    const end = screen.getByRole("combobox", { name: "End time" });

    expect(start).not.toBe(end);
  });
});
