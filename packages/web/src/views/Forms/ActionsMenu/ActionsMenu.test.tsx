import { fireEvent, render, screen } from "@testing-library/react";
import { type ReactElement } from "react";
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
  it("keeps mouse hover from stealing focus from the editor action trigger", () => {
    renderMenu(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    const trigger = screen.getByLabelText("Open actions menu");
    trigger.focus();

    fireEvent.click(trigger);
    fireEvent.mouseMove(screen.getByText("Delete Event"));

    expect(document.activeElement).toBe(trigger);
  });

  it("keeps the menu mounted when focus moves inside it", () => {
    renderMenu(
      <ActionsMenu bgColor="#fff">{() => <TestMenuItem />}</ActionsMenu>,
    );

    fireEvent.click(screen.getByLabelText("Open actions menu"));
    fireEvent.focus(screen.getByText("Delete Event"));

    expect(screen.getByText("Delete Event")).toBeInTheDocument();
  });
});
