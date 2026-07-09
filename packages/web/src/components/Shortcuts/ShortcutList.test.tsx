import { render, screen } from "@testing-library/react";
import { ShortcutList } from "./ShortcutList";
import { describe, expect, it, mock } from "bun:test";

describe("ShortcutList", () => {
  // A single key combo can legitimately appear more than once in a section
  // (e.g. Shift+ArrowRight moves a calendar event to the next day AND schedules
  // a Someday event, depending on focus). Keying rows on the combo alone made
  // those collide, firing React's "two children with the same key" warning and
  // risking omitted rows. Both rows must render, warning-free.
  it("renders duplicate key combos with distinct labels and no key collision", () => {
    const consoleError = mock((..._args: unknown[]) => {});
    const originalError = console.error;
    console.error = consoleError;

    try {
      render(
        <ShortcutList
          shortcuts={[
            { keys: ["Shift", "ArrowRight"], label: "Move event to next day" },
            { keys: ["Shift", "ArrowRight"], label: "Schedule someday event" },
          ]}
        />,
      );
    } finally {
      console.error = originalError;
    }

    expect(screen.getByText("Move event to next day")).toBeInTheDocument();
    expect(screen.getByText("Schedule someday event")).toBeInTheDocument();
    expect(
      consoleError.mock.calls.some((call) =>
        String(call[0]).includes("same key"),
      ),
    ).toBe(false);
  });


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
