import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { getTimeOptions } from "@web/common/utils/datetime/web.date.util";
import { TimePicker } from "./TimePicker";
import { describe, expect, it } from "bun:test";

const options = getTimeOptions();
const fiveThirty = { label: "5:30 PM", value: "5:30 PM" };

function Harness({
  initialValue = options[0],
}: {
  initialValue?: SelectOption<string>;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <TimePicker
        aria-label="End time"
        inputId="endTimePicker"
        isMenuOpen={isMenuOpen}
        onChange={setValue}
        options={options}
        setIsMenuOpen={setIsMenuOpen}
        value={value}
      />
      <button type="button">Description</button>
    </div>
  );
}

const focusedOptionName = (combobox: HTMLElement) => {
  const activeId = combobox.getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  const option = document.getElementById(activeId!);
  expect(option).toBeTruthy();
  return option!;
};

describe("TimePicker", () => {
  it("closes its menu when focus moves elsewhere in the form, instead of staying open forever", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Description" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("focuses the current time on open so arrow keys move one interval", async () => {
    const user = userEvent.setup();
    // Pass a separately constructed value object (same shape the form uses).
    render(<Harness initialValue={{ ...fiveThirty }} />);

    const combobox = screen.getByRole("combobox", { name: "End time" });
    await user.click(combobox);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(focusedOptionName(combobox)).toHaveTextContent("5:30 PM");

    await user.keyboard("{ArrowUp}");
    expect(focusedOptionName(combobox)).toHaveTextContent("5:15 PM");

    await user.keyboard("{ArrowDown}");
    expect(focusedOptionName(combobox)).toHaveTextContent("5:30 PM");

    await user.keyboard("{ArrowDown}");
    expect(focusedOptionName(combobox)).toHaveTextContent("5:45 PM");
  });

  it("keeps a custom time selectable and arrow-navigable from nearby intervals", async () => {
    const user = userEvent.setup();
    render(<Harness initialValue={{ label: "5:33 PM", value: "5:33 PM" }} />);

    const combobox = screen.getByRole("combobox", { name: "End time" });
    await user.click(combobox);

    const listbox = screen.getByRole("listbox");
    expect(
      within(listbox).getByRole("option", { name: "5:33 PM" }),
    ).toBeInTheDocument();
    expect(focusedOptionName(combobox)).toHaveTextContent("5:33 PM");

    await user.keyboard("{ArrowUp}");
    expect(focusedOptionName(combobox)).toHaveTextContent("5:30 PM");

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(focusedOptionName(combobox)).toHaveTextContent("5:45 PM");
  });
});
