import { HotkeyManager, resolveModifier } from "@tanstack/react-hotkeys";
import { render, waitFor } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  type SomedayFormShortcutsProps,
  useSomedayFormShortcuts,
} from "@web/views/Forms/SomedayEventForm/useSomedayFormShortcuts";

/**
 * Helper function to dispatch a keyboard event to the document
 */
function dispatchKeyEvent(
  key: string,
  type: "keydown" | "keyup",
  options: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
    cancelable: true,
    composed: true,
    ...options,
  });
  document.dispatchEvent(event);
}

const TestComponent = (props: SomedayFormShortcutsProps) => {
  useSomedayFormShortcuts(props);
  return null;
};

describe("SomedayEventForm shortcuts hook", () => {
  const baseEvent = createMockStandaloneEvent({
    isSomeday: true,
  });

  const defaultProps: SomedayFormShortcutsProps = {
    event: baseEvent,
    category: Categories_Event.SOMEDAY_WEEK,
    onSubmit: jest.fn(),
    onDelete: jest.fn(),
    onDuplicate: jest.fn(),
    onMigrate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    HotkeyManager.resetInstance();
  });

  test("delete shortcut calls onDelete", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("Delete", "keydown");
    dispatchKeyEvent("Delete", "keyup");

    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });

  test("enter shortcut calls onSubmit", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("Enter", "keydown");
    dispatchKeyEvent("Enter", "keyup");

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  test("mod+d shortcut calls onDuplicate", async () => {
    const modifierKey = resolveModifier("Mod");
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("d", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });
    dispatchKeyEvent("d", "keyup", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    await waitFor(() => {
      expect(defaultProps.onDuplicate).toHaveBeenCalled();
    });
  });

  test("ctrl+meta+arrowup calls onMigrate with 'up'", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("ArrowUp", "keydown", {
      ctrlKey: true,
      metaKey: true,
    });

    await waitFor(() => {
      expect(defaultProps.onMigrate).toHaveBeenCalledWith(
        defaultProps.event,
        defaultProps.category,
        "up",
      );
    });
  });

  test("ctrl+meta+arrowdown calls onMigrate with 'down'", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("ArrowDown", "keydown", {
      ctrlKey: true,
      metaKey: true,
    });

    await waitFor(() => {
      expect(defaultProps.onMigrate).toHaveBeenCalledWith(
        defaultProps.event,
        defaultProps.category,
        "down",
      );
    });
  });

  test("ctrl+meta+arrowright calls onMigrate with 'forward'", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("ArrowRight", "keydown", {
      ctrlKey: true,
      metaKey: true,
    });

    await waitFor(() => {
      expect(defaultProps.onMigrate).toHaveBeenCalledWith(
        defaultProps.event,
        defaultProps.category,
        "forward",
      );
    });
  });

  test("ctrl+meta+arrowleft calls onMigrate with 'back'", async () => {
    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent("ArrowLeft", "keydown", {
      ctrlKey: true,
      metaKey: true,
    });

    await waitFor(() => {
      expect(defaultProps.onMigrate).toHaveBeenCalledWith(
        defaultProps.event,
        defaultProps.category,
        "back",
      );
    });
  });

  test("$mod+enter calls onSubmit", async () => {
    const modifierKey = resolveModifier("Mod");
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });
    dispatchKeyEvent("Enter", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });
    dispatchKeyEvent("Enter", "keyup", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });
  });

  test("enter does not call onSubmit when target is a menu item", async () => {
    render(<TestComponent {...defaultProps} />);

    const menuItem = document.createElement("div");
    menuItem.setAttribute("role", "menuitem");
    document.body.appendChild(menuItem);

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    Object.defineProperty(event, "target", { value: menuItem });
    document.dispatchEvent(event);

    await waitFor(() => {
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    document.body.removeChild(menuItem);
  });

  test("enter does not call onSubmit when target is inside a combobox", async () => {
    render(<TestComponent {...defaultProps} />);

    const comboboxContainer = document.createElement("div");
    comboboxContainer.setAttribute("role", "combobox");
    const input = document.createElement("input");
    comboboxContainer.appendChild(input);
    document.body.appendChild(comboboxContainer);

    const event = new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
      composed: true,
    });
    Object.defineProperty(event, "target", { value: input });
    document.dispatchEvent(event);

    await waitFor(() => {
      expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    });

    document.body.removeChild(comboboxContainer);
  });
});
