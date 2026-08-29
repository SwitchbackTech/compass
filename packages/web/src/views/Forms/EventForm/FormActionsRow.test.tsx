import { resolveModifier } from "@tanstack/react-hotkeys";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormActionsRow } from "@web/views/Forms/EventForm/FormActionsRow";
import { afterEach, describe, expect, it, mock } from "bun:test";

const renderRow = (props: Partial<Parameters<typeof FormActionsRow>[0]> = {}) =>
  render(
    <FormActionsRow
      isExistingEvent={true}
      onClose={mock()}
      onDelete={mock()}
      onDuplicate={mock()}
      {...props}
    />,
  );

const toolbar = () => screen.getByRole("toolbar", { name: "Event actions" });
const buttons = () => within(toolbar()).getAllByRole("button");

afterEach(cleanup);

describe("FormActionsRow", () => {
  it("renders duplicate, delete and close for a saved, writable event", () => {
    renderRow();

    expect(
      buttons().map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Duplicate", "Delete", "Close"]);
  });

  it("hides duplicate for an unsaved draft, which has nothing to copy", () => {
    renderRow({ isExistingEvent: false });

    expect(
      buttons().map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Delete", "Close"]);
  });

  it("hides delete for a read-only event but keeps duplicate and close", () => {
    renderRow({ isReadOnly: true });

    expect(
      buttons().map((button) => button.getAttribute("aria-label")),
    ).toEqual(["Duplicate", "Close"]);
  });

  it("is a single tab stop: exactly one button is tabbable", () => {
    renderRow();

    const tabbable = buttons().filter(
      (button) => button.getAttribute("tabindex") === "0",
    );
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAttribute("aria-label", "Duplicate");
  });

  it("moves focus with arrow keys, wrapping at both ends", async () => {
    const user = userEvent.setup();
    renderRow();
    const [duplicate, deleteButton, close] = buttons();

    duplicate.focus();
    await user.keyboard("{ArrowRight}");
    expect(deleteButton).toHaveFocus();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(duplicate).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(close).toHaveFocus();
  });

  it("jumps to the ends with Home and End", async () => {
    const user = userEvent.setup();
    renderRow();
    const [duplicate, , close] = buttons();

    duplicate.focus();
    await user.keyboard("{End}");
    expect(close).toHaveFocus();

    await user.keyboard("{Home}");
    expect(duplicate).toHaveFocus();
  });

  it("keeps the roving index in range when duplicate disappears", async () => {
    const user = userEvent.setup();
    const { rerender } = renderRow();

    buttons()[2].focus();
    await user.keyboard("{ArrowLeft}");
    expect(buttons()[1]).toHaveFocus();

    // A saved event reverting to a draft drops Duplicate, shortening the row
    // under a roving index that was pointing at the old last item.
    rerender(
      <FormActionsRow
        isExistingEvent={false}
        onClose={mock()}
        onDelete={mock()}
        onDuplicate={mock()}
      />,
    );

    const remaining = buttons();
    expect(remaining).toHaveLength(2);
    expect(
      remaining.filter((button) => button.getAttribute("tabindex") === "0"),
    ).toHaveLength(1);
  });

  it("calls the matching handler when a button is activated", async () => {
    const user = userEvent.setup();
    const onDuplicate = mock();
    const onDelete = mock();
    const onClose = mock();
    renderRow({ onClose, onDelete, onDuplicate });

    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("reveals each action's shortcut on hover, so the keys are learnable", async () => {
    const user = userEvent.setup();
    renderRow();

    await user.hover(screen.getByRole("button", { name: "Duplicate" }));

    const modIcon = `${resolveModifier("Mod").toLowerCase()}-icon`;
    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toContain("Duplicate");
    expect(within(tooltip).getByTestId(modIcon)).toBeInTheDocument();
    expect(within(tooltip).getByTestId("d-icon")).toBeInTheDocument();
  });
});
