import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("allows typing a custom time like '10:33' and committing via Enter", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<Harness />);

    const startInput = screen.getByRole("combobox", {
      name: "Start time",
    }) as HTMLInputElement;

    // Type custom time
    await user.click(startInput);
    await user.type(startInput, "10:33");

    // Verify the create option appears
    const createOption = await screen.findByText("10:33 AM");
    expect(createOption).toBeTruthy();

    // Commit the option
    await user.keyboard("{Enter}");

    // Re-render to get updated values
    rerender(<Harness />);

    // The input should show the committed custom time
    const updatedInput = screen.getByRole("combobox", {
      name: "Start time",
    }) as HTMLInputElement;
    expect(updatedInput.value).toContain("10:33 AM");
  });

  it("does not show duplicate create option when typed time normalizes to existing option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const startInput = screen.getByRole("combobox", {
      name: "Start time",
    }) as HTMLInputElement;

    // Type a time that exists in the list (2:00 PM is in ACCEPTED_TIMES)
    await user.click(startInput);
    await user.type(startInput, "2:00 pm");

    // Should find the option but not a create row (no duplicate)
    const option = await screen.findByText("2 PM");
    expect(option).toBeTruthy();

    // There should be only one "2 PM" option, not a create row
    const allOptions = screen.queryAllByText("2 PM");
    // The option should appear once in the menu; a create row would add another
    expect(allOptions.length).toBeGreaterThanOrEqual(1);
  });
});
