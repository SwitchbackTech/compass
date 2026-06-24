import { render, screen } from "@testing-library/react";
import { ShortcutList } from "./ShortcutList";
import { describe, expect, it } from "bun:test";

describe("ShortcutList", () => {
  it("renders each key of a combo as its own keycap chip", () => {
    render(
      <ShortcutList
        shortcuts={[
          { keys: ["Shift", "w"], label: "Create Someday week event" },
        ]}
      />,
    );

    const row = screen
      .getByText("Create Someday week event")
      .closest("li") as HTMLLIElement;
    const keycaps = row.querySelectorAll("[aria-hidden='true']");
    const label = screen.getByText("Create Someday week event");

    // One chip per key — "Shift" and "W" — rather than a single "Shift + w".
    expect(keycaps).toHaveLength(2);
    expect(keycaps[0]?.textContent).toBe("Shift");
    expect(keycaps[1]?.textContent).toBe("W");
    expect(label).toHaveClass("flex-1");
    expect(label).not.toHaveClass("truncate");
    expect(row).toHaveClass("justify-between");
    expect(row).not.toHaveClass("border");
  });
});
