import { tryOpenDescriptionLinkFromDigit } from "@web/components/DescriptionEditor/description-link.util";
import { describe, expect, it, mock } from "bun:test";

describe("tryOpenDescriptionLinkFromDigit", () => {
  it("opens the nth link for a bare digit", () => {
    const openSpy = mock(() => null);
    const originalOpen = window.open;
    window.open = openSpy as typeof window.open;

    const root = document.createElement("div");
    root.innerHTML =
      '<p><a href="https://one.example/a">one</a><a href="https://two.example/b">two</a></p>';

    const opened = tryOpenDescriptionLinkFromDigit(
      {
        key: "2",
        code: "Digit2",
        metaKey: false,
        ctrlKey: false,
        altKey: false,
      },
      root,
    );

    expect(opened).toBe(true);
    expect(openSpy).toHaveBeenCalledWith(
      "https://two.example/b",
      "_blank",
      expect.any(String),
    );

    window.open = originalOpen;
  });
});
