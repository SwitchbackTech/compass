import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipWrapper } from "./TooltipWrapper";

describe("TooltipWrapper", () => {
  it("renders children", () => {
    render(
      <TooltipWrapper>
        <button>My Button</button>
      </TooltipWrapper>,
    );
    expect(
      screen.getByRole("button", { name: /my button/i }),
    ).toBeInTheDocument();
  });

  it("shows description when provided", async () => {
    const user = userEvent.setup();
    render(
      <TooltipWrapper description="Tooltip info">
        <button>Info</button>
      </TooltipWrapper>,
    );
    // Open tooltip by hovering
    const button = screen.getByRole("button", { name: /info/i });
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("Tooltip info")).toBeInTheDocument();
    });
  });

  it("shows shortcut when string shortcut provided", async () => {
    const user = userEvent.setup();
    render(
      <TooltipWrapper shortcut="Ctrl+S">
        <button>Save</button>
      </TooltipWrapper>,
    );
    const button = screen.getByRole("button", { name: /save/i });
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("Ctrl+S")).toBeInTheDocument();
    });
  });

  it("shows shortcut when ReactNode shortcut provided", async () => {
    const user = userEvent.setup();
    render(
      <TooltipWrapper shortcut={<span data-testid="shortcut-node">ALT+A</span>}>
        <button>Action</button>
      </TooltipWrapper>,
    );
    const button = screen.getByRole("button", { name: /action/i });
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByTestId("shortcut-node")).toBeInTheDocument();
    });
  });

  it("calls onClick when tooltip trigger is clicked", () => {
    const onClick = jest.fn();
    render(
      <TooltipWrapper onClick={onClick}>
        <button>ClickMe</button>
      </TooltipWrapper>,
    );
    fireEvent.click(screen.getByRole("button", { name: /clickme/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not render tooltip content until opened", async () => {
    const user = userEvent.setup();
    render(
      <TooltipWrapper description="Hidden text">
        <button>Open</button>
      </TooltipWrapper>,
    );
    expect(screen.queryByText("Hidden text")).not.toBeInTheDocument();
    const button = screen.getByRole("button", { name: /open/i });
    await user.hover(button);
    await waitFor(() => {
      expect(screen.getByText("Hidden text")).toBeInTheDocument();
    });
  });
});
