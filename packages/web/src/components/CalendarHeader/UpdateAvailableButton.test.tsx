import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";
import { UpdateAvailableButton } from "./UpdateAvailableButton";

describe("UpdateAvailableButton", () => {
  it("shows the Mod+R reload shortcut on the get-latest-version tooltip", async () => {
    const user = userEvent.setup();
    render(<UpdateAvailableButton />);

    await user.hover(
      screen.getByRole("button", { name: "Get latest version" }),
    );

    const tooltip = await screen.findByRole("tooltip");
    await waitFor(() => {
      expect(
        within(tooltip).getByText("Get latest version"),
      ).toBeInTheDocument();
    });
    expect(within(tooltip).getByText("R")).toBeInTheDocument();
  });
});
