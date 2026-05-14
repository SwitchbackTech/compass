import { markSourcePlaceholder, restoreSourcePlaceholder } from "./placeholder";
import { describe, expect, it } from "bun:test";

describe("placeholder", () => {
  it("marks and restores the source event without removing it from layout", () => {
    const source = document.createElement("div");
    source.style.visibility = "visible";

    const placeholder = markSourcePlaceholder(source);

    expect(source.getAttribute("data-week-interaction-placeholder")).toBe(
      "true",
    );
    expect(source.style.visibility).toBe("hidden");

    restoreSourcePlaceholder(placeholder);

    expect(source.hasAttribute("data-week-interaction-placeholder")).toBe(
      false,
    );
    expect(source.style.visibility).toBe("visible");
  });
});
