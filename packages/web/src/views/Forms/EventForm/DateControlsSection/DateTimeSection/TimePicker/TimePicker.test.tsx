import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { TimePicker } from "./TimePicker";
import { describe, expect, it } from "bun:test";

const options: SelectOption<string>[] = [
  { value: "13:00", label: "1 PM" },
  { value: "13:15", label: "1:15 PM" },
  { value: "13:30", label: "1:30 PM" },
];

function Harness() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [value, setValue] = useState(options[0]);

  return (
    <div>
      <TimePicker
        inputId="startTimePicker"
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

describe("TimePicker", () => {
  it("closes its menu when focus moves elsewhere in the form, instead of staying open forever", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Description" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("commits the focused filtered option when the user presses Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "1:30");
    await user.tab();

    expect(combobox).toHaveTextContent("1:30 PM");
    expect(screen.getByRole("button", { name: "Description" })).toHaveFocus();
  });

  it("keeps the original value when Tabbing without choosing a new option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.tab();

    expect(combobox).toHaveTextContent("1 PM");
    expect(screen.getByRole("button", { name: "Description" })).toHaveFocus();
  });

  it("discards typed filter on Escape instead of committing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "1:30");
    await user.keyboard("{Escape}");

    expect(combobox).toHaveTextContent("1 PM");
  });
});
