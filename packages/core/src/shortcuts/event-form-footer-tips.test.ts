import { buildEventFormFooterTipParts } from "@core/shortcuts/event-form-footer-tips";
import { describe, expect, it } from "bun:test";

describe("buildEventFormFooterTipParts", () => {
  it("returns nothing when focus is outside the form", () => {
    expect(
      buildEventFormFooterTipParts({
        focusInsideForm: false,
        tabNavigationApplies: true,
      }),
    ).toEqual([]);
  });

  it("includes tab navigation and the Mod+0 actions tip when both apply", () => {
    const parts = buildEventFormFooterTipParts({
      focusInsideForm: true,
      tabNavigationApplies: true,
    });
    expect(
      parts.some(
        (part) =>
          typeof part === "object" && "keys" in part && part.keys[0] === "Tab",
      ),
    ).toBe(true);
    expect(
      parts.some(
        (part) => typeof part === "object" && "key" in part && part.key === "0",
      ),
    ).toBe(true);
    expect(parts).toContain(" · ");
  });

  it("omits tab navigation when it would not move between fields", () => {
    const parts = buildEventFormFooterTipParts({
      focusInsideForm: true,
      tabNavigationApplies: false,
    });
    expect(
      parts.some(
        (part) =>
          typeof part === "object" && "keys" in part && part.keys[0] === "Tab",
      ),
    ).toBe(false);
    expect(
      parts.some(
        (part) => typeof part === "object" && "key" in part && part.key === "0",
      ),
    ).toBe(true);
  });
});
