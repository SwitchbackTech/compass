import { render, screen } from "@testing-library/react";
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
});
