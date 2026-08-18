import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import dayjs from "@core/util/date/dayjs";
import { getTimeOptionByValue } from "@web/common/utils/datetime/web.date.util";
import { type GridEventDraft } from "@web/events/event-draft.types";
import {
  createGridEventDraft,
  scheduleDatesFromDraft,
  timedGridSchedule,
} from "@web/events/grid-event-draft.adapter";
import { TimePickers } from "./TimePickers";
import { describe, expect, it } from "bun:test";

const START_DATE = new Date("2026-04-24T14:00:00.000Z");
const END_DATE = new Date("2026-04-24T15:00:00.000Z");

// Mirrors EventForm, which derives the selected dates from the draft
// (scheduleDateStrings(draft)) rather than holding them independently, so a
// draft update moves the dates the next change is measured against.
function Harness({
  start = START_DATE,
  end = END_DATE,
}: {
  start?: Date;
  end?: Date;
}) {
  const [draft, setDraft] = useState<GridEventDraft>(
    createGridEventDraft(timedGridSchedule(start, end)),
  );
  const [startTime, setStartTime] = useState(
    getTimeOptionByValue(dayjs(start)),
  );
  const [endTime, setEndTime] = useState(getTimeOptionByValue(dayjs(end)));

  const dates = scheduleDatesFromDraft(draft);

  return (
    <>
      <TimePickers
        draft={draft}
        endTime={endTime}
        selectedEndDate={dayjs(dates.endDate).toDate()}
        selectedStartDate={dayjs(dates.startDate).toDate()}
        setDraft={setDraft}
        setEndTime={setEndTime}
        setStartTime={setStartTime}
        startTime={startTime}
      />
      <span data-testid="draft-start">{dates.startDate}</span>
      <span data-testid="draft-end">{dates.endDate}</span>
    </>
  );
}

const pick = async (
  user: ReturnType<typeof userEvent.setup>,
  picker: "Start time" | "End time",
  text: string,
) => {
  const combobox = screen.getByRole("combobox", { name: picker });
  await user.click(combobox);
  await user.type(combobox, text);
  await user.tab();
};

describe("TimePickers", () => {
  it("gives the start and end pickers distinct accessible names", () => {
    render(<Harness />);

    const start = screen.getByRole("combobox", { name: "Start time" });
    const end = screen.getByRole("combobox", { name: "End time" });

    expect(start).not.toBe(end);
  });

  // The compliment correction is computed on a fixed calendar-day anchor. When
  // it crosses midnight the corrected time was formatted back to a bare
  // "h:mm A" and paired with the unchanged date, producing end-before-start and
  // an unhandled ZodError out of mapToBackend.
  it("moves the start to the previous day when correcting it backwards past midnight", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        start={new Date("2026-04-24T00:30:00.000Z")}
        end={new Date("2026-04-24T01:00:00.000Z")}
      />,
    );

    await pick(user, "End time", "12:00 AM");

    // 30-minute duration preserved by starting the previous evening, rather
    // than 11:30 PM on the 24th, which would end before it starts.
    expect(screen.getByTestId("draft-start").textContent).toBe(
      "2026-04-23T23:30:00+00:00",
    );
    expect(screen.getByTestId("draft-end").textContent).toBe(
      "2026-04-24T00:00:00+00:00",
    );
  });

  it("moves the end to the next day when correcting it forwards past midnight", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        start={new Date("2026-04-24T22:00:00.000Z")}
        end={new Date("2026-04-24T23:00:00.000Z")}
      />,
    );

    await pick(user, "Start time", "11:30 PM");

    expect(screen.getByTestId("draft-start").textContent).toBe(
      "2026-04-24T23:30:00+00:00",
    );
    expect(screen.getByTestId("draft-end").textContent).toBe(
      "2026-04-25T00:30:00+00:00",
    );
  });
});
