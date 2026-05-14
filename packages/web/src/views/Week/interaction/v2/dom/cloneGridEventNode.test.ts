import { cloneGridEventNode } from "./cloneGridEventNode";
import { describe, expect, it } from "bun:test";

describe("cloneGridEventNode", () => {
  it("creates an inert overlay clone without duplicate ids", () => {
    const source = document.createElement("div");
    source.id = "source-id";
    source.tabIndex = 0;
    source.setAttribute("aria-describedby", "tip");
    const child = document.createElement("span");
    child.id = "child-id";
    source.append(child);

    const clone = cloneGridEventNode(source);

    expect(clone.id).toBe("");
    expect(clone.querySelector("[id]")).toBeNull();
    expect(clone.getAttribute("aria-hidden")).toBe("true");
    expect(clone.getAttribute("data-week-interaction-overlay")).toBe("true");
    expect(clone.getAttribute("tabindex")).toBeNull();
    expect(clone.getAttribute("aria-describedby")).toBeNull();
    expect(clone.style.pointerEvents).toBe("none");
  });
});
