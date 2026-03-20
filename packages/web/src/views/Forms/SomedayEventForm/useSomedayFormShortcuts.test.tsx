import { render, waitFor } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import { getModifierKey } from "@web/common/utils/shortcut/shortcut.util";
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

  test("meta+d shortcut calls onDuplicate", async () => {
    render(<TestComponent {...defaultProps} />);

    // Press Meta key
    dispatchKeyEvent("Meta", "keydown", { metaKey: true });

    // Press 'd' while holding Meta
    dispatchKeyEvent("d", "keydown", { metaKey: true });
    dispatchKeyEvent("d", "keyup", { metaKey: true });

    await waitFor(() => {
      expect(defaultProps.onDuplicate).toHaveBeenCalled();
    });
  });

  test("ctrl+meta+arrowup calls onMigrate with 'up'", async () => {
    const modifierKey = getModifierKey();
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    // Press modifier key
    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    // Press ArrowUp while holding modifier
    dispatchKeyEvent("ArrowUp", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
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
    const modifierKey = getModifierKey();
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    // Press modifier key
    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    // Press ArrowDown while holding modifier
    dispatchKeyEvent("ArrowDown", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
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
    const modifierKey = getModifierKey();
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    // Press modifier key
    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    // Press ArrowRight while holding modifier
    dispatchKeyEvent("ArrowRight", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
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
    const modifierKey = getModifierKey();
    const isCtrl = modifierKey === "Control";

    render(<TestComponent {...defaultProps} />);

    // Press modifier key
    dispatchKeyEvent(modifierKey, "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
    });

    // Press ArrowLeft while holding modifier
    dispatchKeyEvent("ArrowLeft", "keydown", {
      ctrlKey: isCtrl,
      metaKey: !isCtrl,
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
    const modifierKey = getModifierKey();
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

    const event = new KeyboardEvent("keyup", {
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

    const event = new KeyboardEvent("keyup", {
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
