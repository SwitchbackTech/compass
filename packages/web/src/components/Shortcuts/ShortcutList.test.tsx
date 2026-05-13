import { render, screen } from "@testing-library/react";
import { ShortcutList } from "./ShortcutList";
import { describe, expect, it } from "bun:test";

describe("ShortcutList", () => {
  it("renders modified shortcuts in one compact keycap", () => {
    render(
      <ShortcutList
        shortcuts={[{ k: "Shift+w", label: "Create Someday week event" }]}
      />,
    );

    const row = screen
      .getByText("Create Someday week event")
      .closest("li") as HTMLLIElement;
    const keycaps = row.querySelectorAll("[aria-hidden='true']");
    const label = screen.getByText("Create Someday week event");

    expect(keycaps).toHaveLength(1);
    expect(keycaps[0]?.textContent).toBe("Shift + w");
    expect(label).toHaveClass("flex-1");
    expect(label).not.toHaveClass("truncate");
    expect(row).toHaveClass("justify-between");
    expect(row).not.toHaveClass("border");
  });
});
