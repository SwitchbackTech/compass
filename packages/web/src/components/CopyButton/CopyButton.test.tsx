import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CopyButton } from "@web/components/CopyButton/CopyButton";
import { describe, expect, it, mock } from "bun:test";

mock.module("@web/common/utils/clipboard/clipboard.util", () => ({
  copyText: mock(async () => true),
}));

describe("CopyButton", () => {
  it("copies text and shows a checkmark label", async () => {
    const user = userEvent.setup();
    render(<CopyButton label="copy event title" text="Standup" />);

    const button = screen.getByRole("button", { name: "copy event title" });
    expect(button).toHaveAttribute("data-pointer-pass", "");
    await user.click(button);

    expect(await screen.findByRole("button", { name: "Copied" })).toBeVisible();
  });

  it("is disabled when there is nothing to copy", () => {
    render(<CopyButton label="copy event title" text="   " />);
    expect(
      screen.getByRole("button", { name: "copy event title" }),
    ).toBeDisabled();
  });
});
