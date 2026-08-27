import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "bun:test";
import "@testing-library/jest-dom";
import { expandModInShortcutDisplay } from "@web/shortcuts/shortcut.util";
import { UpdateAvailableButton } from "./UpdateAvailableButton";

describe("UpdateAvailableButton", () => {
  it("shows the Mod+R reload shortcut on the get-latest-version tooltip", async () => {
    const user = userEvent.setup();
    render(<UpdateAvailableButton />);

    await user.hover(
      screen.getByRole("button", { name: "Get latest version" }),
    );

    await waitFor(() => {
      expect(screen.getByText("Get latest version")).toBeInTheDocument();
    });

    const modifier = expandModInShortcutDisplay("Mod");
    expect(
      screen.getByTestId(`${modifier.toLowerCase()}-icon`),
    ).toBeInTheDocument();
    expect(screen.getByText("R")).toBeInTheDocument();
  });
});
