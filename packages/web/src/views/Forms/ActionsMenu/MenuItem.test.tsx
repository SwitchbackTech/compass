import { KeyboardEvent } from "react";
import "@testing-library/jest-dom";
import { fireEvent, screen } from "@testing-library/react";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { useMenuContext } from "./ActionsMenu";
import MenuItem from "./MenuItem";

jest.mock("./ActionsMenu", () => ({
  useMenuContext: jest.fn(),
}));

const mockUseMenuContext = useMenuContext as jest.Mock;

describe("MenuItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders as a button element without submitting the parent form", () => {
    mockUseMenuContext.mockReturnValue(null);

    render(<MenuItem bgColor="#000">Delete</MenuItem>);

    const menuItem = screen.getByRole("menuitem");

    expect(menuItem).toHaveAttribute("type", "button");
  });

  it("invokes click handler and stops propagation when activated with Enter", () => {
    const onClick = jest.fn();
    let capturedHandlers: {
      onKeyDown?: (event: KeyboardEvent<HTMLButtonElement>) => void;
    } | null = null;

    const getItemProps = jest.fn((props) => {
      capturedHandlers = props;
      return props;
    });

    mockUseMenuContext.mockReturnValue({
      getItemProps,
      listRef: { current: [] },
      activeIndex: 0,
    });

    render(
      <MenuItem bgColor="#000" onClick={onClick}>
        Delete
      </MenuItem>,
    );

    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();
    const keyboardEvent = {
      key: "Enter",
      preventDefault,
      stopPropagation,
    } as unknown as KeyboardEvent<HTMLButtonElement>;

    capturedHandlers?.onKeyDown?.(keyboardEvent);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledWith(keyboardEvent);
  });

  it("does not invoke click handler for non activation keys", () => {
    const onClick = jest.fn();
    const getItemProps = jest.fn((props) => props);

    mockUseMenuContext.mockReturnValue({
      getItemProps,
      listRef: { current: [] },
      activeIndex: 0,
    });

    render(
      <MenuItem bgColor="#000" onClick={onClick}>
        Delete
      </MenuItem>,
    );

    const menuItem = screen.getByRole("menuitem");

    fireEvent.keyDown(menuItem, { key: "ArrowDown" });

    expect(onClick).not.toHaveBeenCalled();
  });
});
