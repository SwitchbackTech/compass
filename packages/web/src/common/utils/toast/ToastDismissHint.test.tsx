import { render, screen } from "@testing-library/react";
import { ToastDismissHint } from "@web/common/utils/toast/ToastDismissHint";
import { describe, expect, it } from "bun:test";

describe("ToastDismissHint", () => {
  it("shows an Esc keycap and how to dismiss", () => {
    render(<ToastDismissHint />);

    expect(screen.getByRole("note")).toBeTruthy();
    expect(screen.getByText("Press Esc to dismiss")).toBeTruthy();
    expect(screen.getByText("Esc")).toBeTruthy();
  });
});
