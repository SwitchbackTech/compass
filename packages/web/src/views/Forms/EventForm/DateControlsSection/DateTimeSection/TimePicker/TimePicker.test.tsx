import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { type SelectOption } from "@web/common/types/component.types";
import { getTimeOptions } from "@web/common/utils/datetime/web.date.util";
import { TimePicker } from "./TimePicker";
import { describe, expect, it } from "bun:test";

const intervalOptions: SelectOption<string>[] = [
  { value: "13:00", label: "1 PM" },
  { value: "13:15", label: "1:15 PM" },
  { value: "13:30", label: "1:30 PM" },
];
const dayOptions = getTimeOptions();
const fiveThirty = { label: "5:30 PM", value: "5:30 PM" };

function Harness({
  initialValue = intervalOptions[0],
  options = intervalOptions,
}: {
  initialValue?: SelectOption<string>;
  options?: SelectOption<string>[];
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <TimePicker
        aria-label="Start time"
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

    await user.click(screen.getByRole("combobox", { name: "Start time" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Description" }));

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("commits the focused filtered option when the user presses Tab", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox", { name: "Start time" });
    await user.click(combobox);
    await user.type(combobox, "1:30");
    await user.tab();

    expect(screen.getByText("1:30 PM")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Description" })).toHaveFocus();
  });

  it("keeps the original value when Tabbing without choosing a new option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox", { name: "Start time" });
    await user.click(combobox);
    await user.tab();

    expect(screen.getByText("1 PM")).toBeInTheDocument();
    expect(screen.queryByText("1:30 PM")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Description" })).toHaveFocus();
  });

  it("discards typed filter on Escape instead of committing", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox", { name: "Start time" });
    await user.click(combobox);
    await user.type(combobox, "1:30");
    await user.keyboard("{Escape}");

    expect(screen.getByText("1 PM")).toBeInTheDocument();
    expect(screen.queryByText("1:30 PM")).not.toBeInTheDocument();
  });

  it("does not commit while IME composition is active", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const combobox = screen.getByRole("combobox", { name: "Start time" });
    await user.click(combobox);
    await user.type(combobox, "1:30");
    fireEvent.keyDown(combobox, { key: "Tab", isComposing: true });

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.getByText("1 PM")).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("announces that Tab selects the focused option", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("combobox", { name: "Start time" }));

    expect(
      screen.getByText(/press Tab to select the option and exit the menu/i),
    ).toBeInTheDocument();
  });
});

const focusedOptionName = (combobox: HTMLElement) => {
  const activeId = combobox.getAttribute("aria-activedescendant");
  expect(activeId).toBeTruthy();
  const option = document.getElementById(activeId!);
  expect(option).toBeTruthy();
  return option!;
};

describe("TimePicker arrow-key focus", () => {
  it("focuses the current time on open so arrow keys move one interval", async () => {
    const user = userEvent.setup();
    render(<Harness initialValue={{ ...fiveThirty }} options={dayOptions} />);

    const combobox = screen.getByRole("combobox", { name: "Start time" });
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
    render(
      <Harness
        initialValue={{ label: "5:33 PM", value: "5:33 PM" }}
        options={dayOptions}
      />,
    );

    const combobox = screen.getByRole("combobox", { name: "Start time" });
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
