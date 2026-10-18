import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { EventFormDateField } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/EventFormDateField";
import { formatEventFormDateLabel } from "@web/views/Forms/EventForm/DateControlsSection/DateTimeSection/eventFormDateField.util";
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
  it("shows compact MM.DD.YY labels when closed", () => {
    render(<Harness />);
    expect(screen.getByTitle("Pick Start Date")).toHaveValue(
      formatEventFormDateLabel(START),
    );
  });

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

  it("parses DD.MM.YY when the day is greater than 12", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(<Harness onCommit={onCommit} />);

    const input = screen.getByTitle("Pick Start Date");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "17.10.26");
    await user.keyboard("{Enter}");

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].getMonth()).toBe(9);
    expect(onCommit.mock.calls[0]?.[0].getDate()).toBe(17);
  });

  it("commits a typed date on Tab instead of discarding it", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(<Harness onCommit={onCommit} />);

    const input = screen.getByTitle("Pick Start Date");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "10.20.26");
    await user.tab();

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].getDate()).toBe(20);
  });

  it("commits a typed date when focus leaves the field", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(
      <>
        <Harness onCommit={onCommit} />
        <button type="button">Elsewhere</button>
      </>,
    );

    const input = screen.getByTitle("Pick Start Date");
    await user.click(input);
    await user.clear(input);
    await user.type(input, "10.21.26");
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0].getDate()).toBe(21);
  });

  it("restores the date when Enter is pressed on an empty field", async () => {
    const user = userEvent.setup();
    const onCommit = mock();
    render(<Harness onCommit={onCommit} />);

    const input = screen.getByTitle("Pick Start Date");
    await user.click(input);
    await user.clear(input);
    await user.keyboard("{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue(formatEventFormDateLabel(START));
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

  it("is reachable in tab order between surrounding controls", async () => {
    const user = userEvent.setup();
    render(
      <>
        <button type="button">Before</button>
        <EventFormDateField
          inputId="eventFormStartDate"
          isOpen={false}
          onCalendarClose={() => undefined}
          onCalendarOpen={() => undefined}
          onCommit={() => undefined}
          selected={START}
          sideLabel="start"
          title="Pick Start Date"
        />
        <button type="button">After</button>
      </>,
    );

    const wrapper = document.getElementById("eventFormStartDate");
    expect(wrapper?.tabIndex).toBe(-1);
    expect(screen.getByTitle("Pick Start Date")).not.toHaveAttribute(
      "tabindex",
      "-1",
    );

    screen.getByRole("button", { name: "Before" }).focus();
    await user.tab();
    expect(screen.getByTitle("Pick Start Date")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("opens the calendar on ArrowDown when arrowDownOpensCalendar is set", async () => {
    const user = userEvent.setup();
    const onCalendarOpen = mock();
    render(
      <EventFormDateField
        arrowDownOpensCalendar
        isOpen={false}
        onCalendarClose={() => undefined}
        onCalendarOpen={onCalendarOpen}
        onCommit={() => undefined}
        selected={START}
        sideLabel="start"
        title="Pick Start Date"
      />,
    );

    screen.getByTitle("Pick Start Date").focus();
    await user.keyboard("{ArrowDown}");

    expect(onCalendarOpen).toHaveBeenCalledTimes(1);
  });
});
