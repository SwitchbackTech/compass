import {
  displayHostForDescriptionLink,
  shouldShortenDescriptionLinkLabel,
} from "@web/components/DescriptionEditor/description-link.util";
import { describe, expect, it } from "bun:test";

describe("description-link.util", () => {
  it("derives a host label without a path", () => {
    expect(
      displayHostForDescriptionLink(
        "https://chatgpt.com/share/6ad62e00-7b10-83e8-abbc-ea1939e176bf",
      ),
    ).toBe("chatgpt.com");
  });

  it("shortens autolink labels but keeps custom link text", () => {
    const href = "https://example.com/meet";
    expect(shouldShortenDescriptionLinkLabel(href, href)).toBe(true);
    expect(
      shouldShortenDescriptionLinkLabel("www.example.com/meet", href),
    ).toBe(true);
    expect(shouldShortenDescriptionLinkLabel("Join meeting", href)).toBe(false);
  });
});
