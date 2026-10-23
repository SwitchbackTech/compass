import { escapeHtml } from "@core/util/escape-html.util";
import { describe, expect, it } from "bun:test";

describe("escapeHtml", () => {
  it("encodes markup and quotes, leaving ampersands already encoded", () => {
    expect(escapeHtml(`<a href="x&y">`)).toBe(
      "&lt;a href=&quot;x&amp;y&quot;&gt;",
    );
  });
});
