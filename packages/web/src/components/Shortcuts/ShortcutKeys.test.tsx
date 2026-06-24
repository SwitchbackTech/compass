import { render, screen } from "@testing-library/react";
import { ShortcutKeys } from "./ShortcutKeys";
import { describe, expect, it } from "bun:test";

const keycaps = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[aria-hidden='true']"));

describe("ShortcutKeys", () => {
  it("renders one keycap chip per key and uppercases lone letters", () => {
    const { container } = render(<ShortcutKeys keys={["Shift", "w"]} />);

    const chips = keycaps(container);
    expect(chips).toHaveLength(2);
    expect(chips[0]?.textContent).toBe("Shift");
    expect(chips[1]?.textContent).toBe("W");
  });

  it("resolves the `cmd` alias to the Meta (Command) icon", () => {
    render(<ShortcutKeys keys={["cmd", "K"]} />);

    // `cmd` -> Meta, which renders an icon rather than literal text.
    expect(screen.getByTestId("meta-icon")).toBeInTheDocument();
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("renders nothing when there are no keys", () => {
    const { container } = render(<ShortcutKeys keys={[]} />);
    expect(keycaps(container)).toHaveLength(0);

    // Blank/whitespace entries are dropped, leaving nothing to render.
    const { container: whitespace } = render(
      <ShortcutKeys keys={["", "  "]} />,
    );
    expect(keycaps(whitespace)).toHaveLength(0);
  });
});
