import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimezoneCombobox } from "@web/timezone/TimezoneCombobox";
import { afterEach, describe, expect, it, mock } from "bun:test";

const noop = () => {};

afterEach(() => {
  document.body.replaceChildren();
});

describe("TimezoneCombobox", () => {
  it("filters by query and commits the active row on Enter", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = mock(noop);

    render(
      <TimezoneCombobox
        onSelect={onSelect}
        searchLabel="Search timezones"
        value="America/Chicago"
      />,
    );

    await user.type(screen.getByRole("combobox"), "berlin");
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith("Europe/Berlin");
  });

  it("moves the active row with arrows without moving real focus", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = mock(noop);

    render(
      <TimezoneCombobox
        onSelect={onSelect}
        searchLabel="Search timezones"
        value="America/Chicago"
      />,
    );

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");

    // aria-activedescendant is the whole point: Tab must stay free.
    expect(document.activeElement).toBe(input);
    expect(input).toHaveAttribute("aria-activedescendant");
  });

  it("shows a non-canonical alias that the IANA catalog omits", () => {
    render(
      <TimezoneCombobox
        onSelect={noop}
        searchLabel="Search timezones"
        // Intl.supportedValuesOf reports only canonical ids, so this zone has
        // no catalog row and used to render as nothing at all.
        value="US/Pacific"
      />,
    );

    expect(screen.getByRole("option", { name: /Pacific/ })).toBeInTheDocument();
  });

  it("commits a head option's value rather than its id", async () => {
    const user = userEvent.setup({ delay: null });
    const onSelect = mock(noop);

    render(
      <TimezoneCombobox
        headOptions={[
          {
            description: "Currently CDT",
            id: "auto",
            label: "Use browser timezone (Auto)",
            selected: true,
            value: null,
          },
        ]}
        onSelect={onSelect}
        searchLabel="Search timezones"
        value={null}
      />,
    );

    await user.click(
      screen.getByRole("option", { name: /Use browser timezone/ }),
    );

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it("does not mount the whole IANA catalog on first paint", () => {
    render(
      <TimezoneCombobox
        onSelect={noop}
        searchLabel="Search timezones"
        value="America/Chicago"
      />,
    );

    // One rendered page, not the ~420-entry catalog.
    expect(screen.getAllByRole("option").length).toBeLessThanOrEqual(40);
  });
});
