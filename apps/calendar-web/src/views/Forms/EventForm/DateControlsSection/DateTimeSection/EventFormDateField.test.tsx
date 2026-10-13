import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { describe, expect, it, mock } from "bun:test";

const START = new Date("2026-10-13T12:00:00.000Z");

function Harness({ onCommit = mock() }: { onCommit?: (date: Date) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(START);

  return (
    <EventFormDateField
      isOpen={isOpen}
      onCalendarClose={() => setIsOpen(false)}
      onCalendarOpen={() => setIsOpen(true)}
      onCommit={(date) => {
        onCommit(date);
        setSelected(date);
        setIsOpen(false);
      }}
      selected={selected}
      sideLabel="start"
      title="Pick Start Date"
    />
  );
}

describe("EventFormDateField", () => {
  it("parses a typed numeric date on Enter", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(<Harness onCommit={onCommit} />);

    const input = screen.getByTitle("Pick Start Date");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "10/15");
    await user.keyboard("{Enter}");

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].getMonth()).toBe(9);
    expect(onCommit.mock.calls[0]?.[0].getDate()).toBe(15);
  });

  it("nudges one day with arrow keys when the calendar is closed", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(<Harness onCommit={onCommit} />);

    const input = screen.getByTitle("Pick Start Date");
    input.focus();
    await user.keyboard("{ArrowUp}");

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].getDate()).toBe(12);
  });
});
