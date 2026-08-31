import "@testing-library/jest-dom";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type TimeZone, TimeZoneSchema } from "@core/types/domain-primitives";
import { BookingTimezoneField } from "@web/booking/BookingTimezoneField";
import { afterEach, describe, expect, it, mock } from "bun:test";

const zone = (id: string): TimeZone => TimeZoneSchema.parse(id);

afterEach(() => {
  // Unmount, not just empty the DOM: OverlayPanel registers an app-lock reason
  // and document listeners in effects, and replaceChildren alone never runs
  // their teardown.
  cleanup();
  document.body.replaceChildren();
});

describe("BookingTimezoneField", () => {
  it("picks a zone by typing, then closes and reports it", async () => {
    const user = userEvent.setup({ delay: null });
    const onChange = mock((_next: TimeZone) => {});

    render(
      <BookingTimezoneField
        onChange={onChange}
        timeZone={zone("America/Chicago")}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /^Booking timezone:/ }),
    );
    await user.type(screen.getByRole("combobox"), "berlin");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalledWith("Europe/Berlin");
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("renders a non-canonical alias instead of going blank", () => {
    render(
      <BookingTimezoneField
        onChange={() => {}}
        timeZone={zone("US/Pacific")}
      />,
    );

    // The old native <select> had no <option> for an alias, so it showed the
    // first zone in the catalog while state held something else.
    expect(
      screen.getByRole("button", { name: /^Booking timezone: Pacific/ }),
    ).toBeInTheDocument();
  });

  it("cannot be opened while disabled", async () => {
    const user = userEvent.setup({ delay: null });

    render(
      <BookingTimezoneField
        disabled
        onChange={() => {}}
        timeZone={zone("America/Chicago")}
      />,
    );

    const trigger = screen.getByRole("button", { name: /^Booking timezone:/ });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
