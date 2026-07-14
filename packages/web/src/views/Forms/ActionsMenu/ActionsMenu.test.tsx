import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { act, type ReactElement } from "react";
import { ActionsMenu, useMenuContext } from "./ActionsMenu";
import MenuItem from "./MenuItem";
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
  it("exposes the trigger as a real button with aria-expanded reflecting open state", async () => {
    const user = userEvent.setup();

    renderMenu(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    const trigger = screen.getByRole("button", { name: "Open actions menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

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

  it("moves focus through every item as arrow keys are pressed", async () => {
    const user = userEvent.setup();

    renderMenu(
      <ActionsMenu bgColor="#fff">
        {() => (
          <>
            <MenuItem bgColor="#fff">First</MenuItem>
            <MenuItem bgColor="#fff">Second</MenuItem>
            <MenuItem bgColor="#fff">Third</MenuItem>
          </>
        )}
      </ActionsMenu>,
    );

    await user.click(screen.getByLabelText("Open actions menu"));

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("First");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Second");

    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.textContent).toBe("Third");
  });
});
