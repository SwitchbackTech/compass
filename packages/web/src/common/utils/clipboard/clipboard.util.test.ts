import { copyText } from "@web/common/utils/clipboard/clipboard.util";
import { afterEach, describe, expect, it, mock } from "bun:test";

const originalClipboard = navigator.clipboard;

const setClipboard = (value: unknown) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value,
    writable: true,
  });
};

afterEach(() => {
  setClipboard(originalClipboard);
});

describe("copyText", () => {
  it("reports success when the write lands", async () => {
    const writeText = mock(() => Promise.resolve());
    setClipboard({ writeText });

    expect(await copyText("https://example.com/book/tyler")).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/book/tyler");
  });

  it("reports failure instead of rejecting when permission is denied", async () => {
    // The three call sites used to invoke writeText with no .catch(), so this
    // surfaced as an unhandled rejection and the button just sat there.
    setClipboard({ writeText: () => Promise.reject(new Error("denied")) });

    expect(await copyText("anything")).toBe(false);
  });

  it("reports failure when there is no clipboard at all", async () => {
    setClipboard(undefined);

    expect(await copyText("anything")).toBe(false);
  });
});
