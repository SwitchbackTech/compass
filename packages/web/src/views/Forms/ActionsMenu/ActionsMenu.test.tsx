import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, type ReactElement } from "react";
import { ActionsMenu, useMenuContext } from "./ActionsMenu";
import { describe, expect, it } from "bun:test";

const renderMenu = (ui: ReactElement) => render(ui);

const TestMenuItem = () => {
  const menuContext = useMenuContext();
  const itemProps = menuContext?.getItemProps() ?? {};

  return (
    <button type="button" role="menuitem" {...itemProps}>
      Delete Event
    </button>
  );
};

describe("ActionsMenu", () => {
  it("keeps mouse hover from stealing focus from the editor action trigger", async () => {
    const user = userEvent.setup();

    renderMenu(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");
    trigger.focus();

    await user.click(trigger);

    act(() => {
      fireEvent.mouseMove(screen.getByText("Delete Event"));
    });

    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the menu mounted when focus moves inside it", async () => {
    const user = userEvent.setup();

    renderMenu(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    await user.click(screen.getByLabelText("Open actions menu"));

    act(() => {
      fireEvent.focus(screen.getByText("Delete Event"));
    });

    expect(screen.getByText("Delete Event")).toBeInTheDocument();
  });

  it("closes the menu when focus leaves the menu tree without stealing focus back", async () => {
    const user = userEvent.setup();

    renderMenu(
      <div>
        <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>
        <button type="button">Priority</button>
      </div>,
    );

    await user.click(screen.getByLabelText("Open actions menu"));

    const menuItem = screen.getByRole("menuitem", { name: "Delete Event" });
    const priorityButton = screen.getByRole("button", { name: "Priority" });

    // jsdom doesn't perform the browser's native Tab-key focus transfer, so
    // we move focus to the next element ourselves to simulate it, then
    // assert the menu doesn't fight that transfer by refocusing the trigger.
    await act(async () => {
      fireEvent.focus(menuItem);
      fireEvent.blur(menuItem, { relatedTarget: priorityButton });
      priorityButton.focus();
      await Promise.resolve();
    });

    expect(screen.queryByRole("menu")).toBeNull();
    expect(priorityButton).toHaveFocus();
  });
});
