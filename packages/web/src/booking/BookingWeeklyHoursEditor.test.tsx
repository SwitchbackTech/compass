import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type WeeklyAvailability } from "@core/types/booking.contracts";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";
import { afterEach, describe, expect, it, mock } from "bun:test";

afterEach(() => {
  document.body.replaceChildren();
});

const renderEditor = (value: WeeklyAvailability = []) => {
  const onChange = mock((_next: WeeklyAvailability) => {});
  render(<BookingWeeklyHoursEditor onChange={onChange} value={value} />);
  return onChange;
};

const lastCall = (onChange: ReturnType<typeof renderEditor>) =>
  onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];

describe("BookingWeeklyHoursEditor", () => {
  it("turns a typed range into availability on blur", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.type(screen.getByLabelText("Monday"), "9-5");
    await user.tab();

    expect(lastCall(onChange)).toEqual([
      { weekday: 1, start: "09:00", end: "17:00" },
    ]);
  });

  it("normalizes the row so the user sees what was understood", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    await user.type(screen.getByLabelText("Tuesday"), "930-5:30p");
    await user.tab();

    expect(screen.getByLabelText("Tuesday")).toHaveValue("9:30am-5:30pm");
  });

  it("treats a blank day as unavailable", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor([
      { weekday: 3, start: "09:00", end: "17:00" },
    ]);

    await user.clear(screen.getByLabelText("Wednesday"));
    await user.tab();

    expect(lastCall(onChange)).toEqual([]);
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);
  });

  it("keeps both intervals on a day with a break", () => {
    // The old editor read the day with .find and destroyed the second
    // interval on the next save.
    renderEditor([
      { weekday: 4, start: "09:00", end: "12:00" },
      { weekday: 4, start: "13:00", end: "17:00" },
    ]);

    expect(screen.getByLabelText("Thursday")).toHaveValue("9am-12pm, 1pm-5pm");
  });

  it("reports an unreadable row without discarding what was typed", async () => {
    const user = userEvent.setup({ delay: null });
    const onValidityChange = mock((_valid: boolean) => {});
    render(
      <BookingWeeklyHoursEditor
        onChange={() => {}}
        onValidityChange={onValidityChange}
        value={[]}
      />,
    );

    await user.type(screen.getByLabelText("Friday"), "whenever");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Could not read "whenever". Try 9-5.',
    );
    expect(screen.getByLabelText("Friday")).toHaveValue("whenever");
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });

  it("applies Monday to the weekdays and leaves the weekend alone", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.type(screen.getByLabelText("Monday"), "9-5");
    await user.click(
      screen.getByRole("button", { name: "Apply Monday to weekdays" }),
    );

    expect(lastCall(onChange)).toEqual([
      { weekday: 1, start: "09:00", end: "17:00" },
      { weekday: 2, start: "09:00", end: "17:00" },
      { weekday: 3, start: "09:00", end: "17:00" },
      { weekday: 4, start: "09:00", end: "17:00" },
      { weekday: 5, start: "09:00", end: "17:00" },
    ]);
    expect(screen.getByLabelText("Saturday")).toHaveValue("");
  });

  it("clears every day", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor([
      { weekday: 1, start: "09:00", end: "17:00" },
      { weekday: 6, start: "10:00", end: "12:00" },
    ]);

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(lastCall(onChange)).toEqual([]);
    expect(screen.getByLabelText("Monday")).toHaveValue("");
  });

  it("costs 9 tab stops, not the 21 the time inputs did", () => {
    renderEditor();

    // 7 day inputs + the two bulk buttons.
    const inputs = screen.getAllByRole("textbox");
    const buttons = screen.getAllByRole("button");
    expect(inputs).toHaveLength(7);
    expect(buttons).toHaveLength(2);
  });
});
