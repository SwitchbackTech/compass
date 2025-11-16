import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@web/__tests__/__mocks__/mock.render";
import { AddSomedayEvent } from "./AddSomedayEvent";

describe("AddSomedayEvent", () => {
  it("renders the plus sign", () => {
    render(<AddSomedayEvent onKeyDown={jest.fn()} />);
    expect(screen.getByText("+")).toBeInTheDocument();
  });

  it("has role button and tabIndex 0", () => {
    render(<AddSomedayEvent onKeyDown={jest.fn()} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("tabIndex", "0");
  });

  it("calls onKeyDown when Enter is pressed", async () => {
    const user = userEvent.setup();
    const onKeyDown = jest.fn();
    render(<AddSomedayEvent onKeyDown={onKeyDown} />);
    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("calls onKeyDown when Space is pressed", async () => {
    const user = userEvent.setup();
    const onKeyDown = jest.fn();
    render(<AddSomedayEvent onKeyDown={onKeyDown} />);
    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard(" ");
    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it("does NOT call onKeyDown for unrelated keys", async () => {
    const user = userEvent.setup();
    const onKeyDown = jest.fn();
    render(<AddSomedayEvent onKeyDown={onKeyDown} />);
    await user.keyboard("a");
    await user.keyboard("{Tab}");
    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
