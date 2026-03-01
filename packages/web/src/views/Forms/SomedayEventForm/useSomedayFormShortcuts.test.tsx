import { render } from "@testing-library/react";
import { Categories_Event } from "@core/types/event.types";
import { createMockStandaloneEvent } from "@core/util/test/ccal.event.factory";
import {
  SOMEDAY_HOTKEY_OPTIONS,
  SomedayFormShortcutsProps,
  useSomedayFormShortcuts,
} from "@web/views/Forms/SomedayEventForm/useSomedayFormShortcuts";

jest.mock("react-hotkeys-hook", () => ({
  useHotkeys: jest.fn(),
}));

const { useHotkeys } = jest.requireMock("react-hotkeys-hook") as {
  useHotkeys: jest.Mock;
};

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

  const getHotkeyHandler = (combo: string) => {
    const call = useHotkeys.mock.calls.find(([registeredCombo]) => {
      return registeredCombo === combo;
    });
    if (!call) {
      throw new Error(`Hotkey ${combo} was not registered`);
    }
    return call[1] as (keyboardEvent: KeyboardEvent) => void;
  };

  test("registers all expected shortcuts with shared options", () => {
    render(<TestComponent {...defaultProps} />);

    const registeredCombos = useHotkeys.mock.calls.map(([combo]) => combo);

    expect(registeredCombos).toEqual([
      "delete",
      "enter",
      "mod+enter",
      "meta+d",
      "ctrl+meta+up",
      "ctrl+meta+down",
      "ctrl+meta+right",
      "ctrl+meta+left",
    ]);

    useHotkeys.mock.calls.forEach(([, , options]) => {
      expect(options).toBe(SOMEDAY_HOTKEY_OPTIONS);
    });
  });

  test("directional shortcuts prevent propagation and call onMigrate", () => {
    render(<TestComponent {...defaultProps} />);

    const keyboardEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent;

    const upHandler = getHotkeyHandler("ctrl+meta+up");
    upHandler(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(keyboardEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(defaultProps.onMigrate).toHaveBeenCalledWith(
      defaultProps.event,
      defaultProps.category,
      "up",
    );
  });

  test("duplicate shortcut prevents propagation and calls onDuplicate", () => {
    render(<TestComponent {...defaultProps} />);

    const keyboardEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent;

    const handler = getHotkeyHandler("meta+d");
    handler(keyboardEvent);

    expect(keyboardEvent.preventDefault).toHaveBeenCalledTimes(1);
    expect(keyboardEvent.stopPropagation).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDuplicate).toHaveBeenCalledTimes(1);
  });

  test("mod+enter shortcut triggers submit with propagation blocked", () => {
    render(<TestComponent {...defaultProps} />);

    const keyboardEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      target: document.createElement("input"),
    } as unknown as KeyboardEvent;

    const handler = getHotkeyHandler("mod+enter");
    handler(keyboardEvent);

    expect(defaultProps.onSubmit).toHaveBeenCalledTimes(1);
  });

  test("mod+enter shortcut invokes onSubmit", () => {
    render(<TestComponent {...defaultProps} />);

    const menuButton = document.createElement("button");
    menuButton.setAttribute("role", "menuitem");

    const keyboardEvent = {
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
      target: menuButton,
    } as unknown as KeyboardEvent;

    const handler = getHotkeyHandler("mod+enter");
    handler(keyboardEvent);

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  test("enter shortcut ignores events originating from the recurrence combobox", () => {
    render(<TestComponent {...defaultProps} />);

    const combobox = document.createElement("div");
    combobox.setAttribute("role", "combobox");

    const keyboardEvent = {
      target: combobox,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as unknown as KeyboardEvent;

    const handler = getHotkeyHandler("enter");
    handler(keyboardEvent);

    expect(defaultProps.onSubmit).not.toHaveBeenCalled();
    expect(keyboardEvent.preventDefault).not.toHaveBeenCalled();
    expect(keyboardEvent.stopPropagation).not.toHaveBeenCalled();
  });
});
