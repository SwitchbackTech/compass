import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
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

const startSelect = () => screen.getByRole("combobox", { name: /Start for/ });

const endSelect = () => screen.getByRole("combobox", { name: /End for/ });

const dayPill = (name: string) => screen.getByRole("button", { name });

describe("BookingWeeklyHoursEditor", () => {
  it("shows one Mon-Fri row at 9:00 AM to 5:00 PM by default", () => {
    renderEditor();

    expect(screen.getAllByRole("combobox", { name: /Start for/ })).toHaveLength(
      1,
    );
    expect(startSelect()).toHaveDisplayValue("9:00 AM");
    expect(endSelect()).toHaveDisplayValue("5:00 PM");
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

  it("emits 17:15 for every selected day when End is 5:15 PM", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.selectOptions(endSelect(), "17:15");

    expect(lastCall(onChange)).toEqual([
      { weekday: 1, start: "09:00", end: "17:15" },
      { weekday: 2, start: "09:00", end: "17:15" },
      { weekday: 3, start: "09:00", end: "17:15" },
      { weekday: 4, start: "09:00", end: "17:15" },
      { weekday: 5, start: "09:00", end: "17:15" },
    ]);
  });

  it("seeds Saturday and Sunday from Add hours, then disables it", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    await user.click(screen.getByRole("button", { name: "Add hours" }));
    const groups = screen.getAllByRole("group", { name: "Days" });
    expect(groups).toHaveLength(2);
    expect(
      within(groups[1]!).getByRole("button", { name: "Saturday" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      within(groups[1]!).getByRole("button", { name: "Sunday" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Add hours" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Add hours" })).toHaveAttribute(
      "title",
      "Every day already has hours",
    );
  });

  it("never lists an End time at or before Start", () => {
    renderEditor();

    const options = within(endSelect())
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(options).not.toContain("09:00");
    expect(options.some((value) => value <= "09:00")).toBe(false);
    expect(options[0]).toBe("09:15");
  });

  it("never shows Choose at least one day", () => {
    renderEditor([]);

    expect(
      screen.queryByText("Choose at least one day."),
    ).not.toBeInTheDocument();
  });

  it("moves focus between day pills with arrow keys", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditor();

    dayPill("Monday").focus();
    await user.keyboard("{ArrowRight}");
    expect(dayPill("Tuesday")).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(dayPill("Monday")).toHaveFocus();
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
    expect(lastCall(onChange)?.filter((entry) => entry.weekday === 1)).toEqual([
      { weekday: 1, start: "09:00", end: "17:00" },
    ]);
  });

  it("leaves a removed row's days unavailable", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = renderEditor();

    await user.click(screen.getByRole("button", { name: "Add hours" }));
    await user.click(screen.getAllByRole("button", { name: "Remove" })[1]!);

    expect(lastCall(onChange)?.some((entry) => entry.weekday === 6)).toBe(
      false,
    );
    expect(screen.getByText(/Unavailable:.*Saturday/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });
});
