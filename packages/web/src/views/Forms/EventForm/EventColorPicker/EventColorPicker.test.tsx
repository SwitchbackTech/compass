import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, mock } from "bun:test";
import "@testing-library/jest-dom";

import { EventColorPicker } from "./EventColorPicker";

describe("EventColorPicker", () => {
  it("selects a color slot and can clear back to calendar default", async () => {
    const user = userEvent.setup();
    const onChange = mock();

    const { rerender } = render(
      <EventColorPicker value={null} onChange={onChange} />,
    );

    await user.click(screen.getByRole("radio", { name: "Blue" }));
    expect(onChange).toHaveBeenCalledWith("blue");

    rerender(<EventColorPicker value="blue" onChange={onChange} />);
    await user.click(screen.getByRole("radio", { name: "Calendar default" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("exposes color name tooltips for the default and slot swatches", () => {
    render(<EventColorPicker value={null} onChange={mock()} />);

    expect(
      screen.getByRole("tooltip", { name: "Calendar default" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tooltip", { name: "Coral" })).toBeInTheDocument();
  });

  it("picks a swatch directly by its top-row digit and moves focus to it", () => {
    const onChange = mock();
    const { rerender } = render(
      <EventColorPicker value={null} onChange={onChange} />,
    );

    const defaultRadio = screen.getByRole("radio", {
      name: "Calendar default",
    });
    const mintRadio = screen.getByRole("radio", { name: "Mint" });
    defaultRadio.focus();

    fireEvent.keyDown(defaultRadio, { code: "Digit3", key: "3" });

    expect(onChange).toHaveBeenCalledWith("mint");
    rerender(<EventColorPicker value="mint" onChange={onChange} />);
    expect(mintRadio).toHaveFocus();
  });

  it("picks calendar default with the first digit and red with the last pick key", () => {
    const onChange = mock();
    render(<EventColorPicker value="mint" onChange={onChange} />);

    const mintRadio = screen.getByRole("radio", { name: "Mint" });
    mintRadio.focus();

    fireEvent.keyDown(mintRadio, { code: "Digit1", key: "1" });
    expect(onChange).toHaveBeenLastCalledWith(null);

    fireEvent.keyDown(mintRadio, { code: "Equal", key: "=" });
    expect(onChange).toHaveBeenLastCalledWith("red");
  });

  it("ignores a digit held with a modifier", () => {
    const onChange = mock();
    render(<EventColorPicker value={null} onChange={onChange} />);

    const defaultRadio = screen.getByRole("radio", {
      name: "Calendar default",
    });
    defaultRadio.focus();

    fireEvent.keyDown(defaultRadio, {
      code: "Digit3",
      key: "3",
      ctrlKey: true,
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("leaves arrow-key navigation untouched", () => {
    const onChange = mock();
    render(<EventColorPicker value={null} onChange={onChange} />);

    const defaultRadio = screen.getByRole("radio", {
      name: "Calendar default",
    });
    defaultRadio.focus();

    fireEvent.keyDown(defaultRadio, { code: "ArrowRight", key: "ArrowRight" });

    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows a pick-key chip on every swatch, hidden until the group is focused", () => {
    render(<EventColorPicker value={null} onChange={mock()} />);

    const chip = screen.getByText("3", { selector: "span[aria-hidden]" });
    expect(chip).toHaveClass("invisible");
    expect(chip).toHaveClass("group-focus-within/picker:visible");
  });
});
