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

    await user.click(screen.getByRole("radio", { name: "blue" }));
    expect(onChange).toHaveBeenCalledWith("blue");

    rerender(<EventColorPicker value="blue" onChange={onChange} />);
    await user.click(
      screen.getByRole("radio", { name: "Calendar default color" }),
    );
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
