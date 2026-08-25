import {
  focusPageJumpTarget,
  getPageJumpFocusElement,
  PAGE_JUMP_ATTRIBUTE,
  PAGE_JUMP_TARGETS,
  type PageJumpTargetId,
} from "@web/shortcuts/page-jump/page-jump.targets";
import { afterEach, describe, expect, it } from "bun:test";

const addAnchor = (id: PageJumpTargetId): HTMLElement => {
  const anchor = document.createElement("section");
  anchor.setAttribute(PAGE_JUMP_ATTRIBUTE, id);
  document.body.append(anchor);
  return anchor;
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PAGE_JUMP_TARGETS", () => {
  it("assigns sequential digits matching each target's list position", () => {
    // usePageJumpShortcut resolves a pressed digit by index, so the digit
    // shown on a chip must always equal index + 1.
    PAGE_JUMP_TARGETS.forEach((target, index) => {
      expect(target.digit).toBe(String(index + 1));
    });
  });
});

describe("getPageJumpFocusElement", () => {
  it("returns null when the anchor is not mounted", () => {
    expect(getPageJumpFocusElement("month-picker")).toBeNull();
  });

  it("returns null when the anchor has nothing focusable", () => {
    // Matches the empty Up Next card: a section with only static text.
    const anchor = addAnchor("up-next");
    anchor.append(document.createTextNode("All clear"));

    expect(getPageJumpFocusElement("up-next")).toBeNull();
  });

  it("prefers an explicit tabindex=0 roving stop over earlier buttons", () => {
    // Mirrors the month picker: react-datepicker's prev/next buttons come
    // first in DOM order, but exactly one day keeps tabindex=0.
    const anchor = addAnchor("month-picker");
    const prevMonth = document.createElement("button");
    anchor.append(prevMonth);
    const day = document.createElement("div");
    day.setAttribute("tabindex", "0");
    anchor.append(day);

    expect(getPageJumpFocusElement("month-picker")).toBe(day);
  });

  it("falls back to the first interactive element", () => {
    const anchor = addAnchor("navigation");
    const disabled = document.createElement("button");
    disabled.disabled = true;
    anchor.append(disabled);
    const arrow = document.createElement("button");
    anchor.append(arrow);

    expect(getPageJumpFocusElement("navigation")).toBe(arrow);
  });
});

describe("focusPageJumpTarget", () => {
  it("focuses the resolved element and reports success", () => {
    const anchor = addAnchor("calendars");
    const toggle = document.createElement("button");
    anchor.append(toggle);

    expect(focusPageJumpTarget("calendars")).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("reports failure when the target cannot take focus", () => {
    expect(focusPageJumpTarget("calendars")).toBe(false);
  });
});
