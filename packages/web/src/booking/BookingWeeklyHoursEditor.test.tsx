import "@testing-library/jest-dom";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  DEFAULT_WEEKLY_AVAILABILITY,
  type WeeklyAvailability,
} from "@core/types/booking.contracts";
import { BookingWeeklyHoursEditor } from "@web/booking/BookingWeeklyHoursEditor";
import { afterEach, describe, expect, it, mock } from "bun:test";

afterEach(() => {
  document.body.replaceChildren();
});

const renderEditor = (
  value: WeeklyAvailability = DEFAULT_WEEKLY_AVAILABILITY,
) => {
  const onChange = mock((_next: WeeklyAvailability) => {});
  render(<BookingWeeklyHoursEditor onChange={onChange} value={value} />);
  return onChange;
};

const lastCall = (onChange: ReturnType<typeof renderEditor>) =>
  onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];

const hoursInput = () => screen.getByRole("textbox", { name: /Hours/ });

const dayPill = (name: string) => screen.getByRole("button", { name });

describe("BookingWeeklyHoursEditor", () => {
  it("shows one Mon-Fri row at 9am-5pm by default", () => {
    renderEditor();

    expect(screen.getAllByRole("textbox", { name: /Hours/ })).toHaveLength(1);
    expect(hoursInput()).toHaveValue("9am-5pm");
    for (const name of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]) {
      expect(dayPill(name)).toHaveAttribute("aria-pressed", "true");
    }
    expect(dayPill("Saturday")).toHaveAttribute("aria-pressed", "false");
    expect(dayPill("Sunday")).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByText("Unavailable: Saturday, Sunday"),
    ).toBeInTheDocument();
  });

  it("emits two intervals for each pressed day after typing a break", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.clear(hoursInput());
    await user.type(hoursInput(), "9-12, 1-5");
    await user.tab();

    expect(lastCall(onChange)).toEqual([
      { weekday: 1, start: "09:00", end: "12:00" },
      { weekday: 1, start: "13:00", end: "17:00" },
      { weekday: 2, start: "09:00", end: "12:00" },
      { weekday: 2, start: "13:00", end: "17:00" },
      { weekday: 3, start: "09:00", end: "12:00" },
      { weekday: 3, start: "13:00", end: "17:00" },
      { weekday: 4, start: "09:00", end: "12:00" },
      { weekday: 4, start: "13:00", end: "17:00" },
      { weekday: 5, start: "09:00", end: "12:00" },
      { weekday: 5, start: "13:00", end: "17:00" },
    ]);
    expect(hoursInput()).toHaveValue("9am-12pm, 1pm-5pm");
  });

  it("adds Saturday intervals from a second row", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.click(screen.getByRole("button", { name: "Add hours" }));
    const groups = screen.getAllByRole("group", { name: "Days" });
    expect(groups).toHaveLength(2);
    const secondInput = screen.getAllByRole("textbox", { name: /Hours/ })[1]!;
    await user.type(secondInput, "10-2");
    await user.tab();

    expect(lastCall(onChange)).toEqual(
      expect.arrayContaining([
        { weekday: 6, start: "10:00", end: "14:00" },
        { weekday: 1, start: "09:00", end: "17:00" },
      ]),
    );
  });

  it("moves Monday onto the second row", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.click(screen.getByRole("button", { name: "Add hours" }));
    const groups = screen.getAllByRole("group", { name: "Days" });
    await user.click(
      within(groups[1]!).getByRole("button", { name: "Monday" }),
    );

    expect(
      within(groups[0]!).getByRole("button", { name: "Monday" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      within(groups[1]!).getByRole("button", { name: "Monday" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(lastCall(onChange)?.filter((entry) => entry.weekday === 1)).toEqual(
      [],
    );
  });

  it("leaves a removed row's days unavailable", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.click(screen.getByRole("button", { name: "Add hours" }));
    const secondInput = screen.getAllByRole("textbox", { name: /Hours/ })[1]!;
    await user.type(secondInput, "10-2");
    await user.tab();
    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]!);

    expect(lastCall(onChange)?.some((entry) => entry.weekday === 6)).toBe(
      false,
    );
    expect(screen.getByText(/Unavailable:.*Saturday/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("commits the input's current value on focusout even if React state lags", () => {
    const onChange = renderEditor();
    const input = hoursInput();
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, "");
    act(() => {
      input.dispatchEvent(new Event("focusout", { bubbles: true }));
    });

    expect(lastCall(onChange)).toEqual([]);
  });

  it("keeps an unreadable range, shows the alert, and reports invalid", async () => {
    const user = userEvent.setup({ delay: null });
    const onValidityChange = mock((_valid: boolean) => {});
    render(
      <BookingWeeklyHoursEditor
        onChange={() => {}}
        onValidityChange={onValidityChange}
        value={DEFAULT_WEEKLY_AVAILABILITY}
      />,
    );

    await user.clear(hoursInput());
    await user.type(hoursInput(), "whenever");
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent(
      'Could not read "whenever". Try 9-5.',
    );
    expect(hoursInput()).toHaveValue("whenever");
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });

  it("costs two tab stops per row plus Remove", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();
    await user.click(screen.getByRole("button", { name: "Add hours" }));

    const groups = screen.getAllByRole("group", { name: "Days" });
    const inputs = screen.getAllByRole("textbox", { name: /Hours/ });
    const remove = screen.getAllByRole("button", { name: "Remove" });
    expect(groups).toHaveLength(2);
    expect(inputs).toHaveLength(2);
    expect(remove).toHaveLength(2);

    const firstGroupButtons = within(groups[0]!).getAllByRole("button");
    const tabStops = firstGroupButtons.filter(
      (button) => button.tabIndex === 0,
    );
    expect(tabStops).toHaveLength(1);
  });
});
