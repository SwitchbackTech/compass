import { render, screen } from "@testing-library/react";
import { ShortcutTipIndicator } from "@web/shortcuts/tips/ShortcutTipIndicator";
import { selectShortcutHint } from "@web/shortcuts/tips/selectShortcutHint";
import { describe, expect, it } from "bun:test";

describe("ShortcutTipIndicator", () => {
  it("renders the hint without a sidebar Hide tips control", () => {
    render(
      <ShortcutTipIndicator
        hint={
          selectShortcutHint({
            isFormOpen: false,
            isLifeView: false,
            eventFocused: false,
            firstEventDone: false,
          })!
        }
      />,
    );

    expect(screen.queryByRole("button", { name: "Hide tips" })).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
