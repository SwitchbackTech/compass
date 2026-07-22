import {
  getCleanLifeShareUrl,
  getLifeShareText,
  getSocialShareUrl,
} from "./life-share";
import { describe, expect, it } from "bun:test";

describe("life sharing", () => {
  it("creates a share message without personal date data", () => {
    expect(getLifeShareText(83)).toBe("This is my life if I live to 83.");
  });

  it("prefills X and Facebook links with the current Life URL", () => {
    const pageUrl = "https://compasscalendar.com/life?variation=random&age=83";
    const xShare = new URL(getSocialShareUrl("x", pageUrl, 83));
    const facebookShare = new URL(getSocialShareUrl("facebook", pageUrl, 83));

    expect(xShare.searchParams.get("text")).toBe(
      "This is my life if I live to 83.",
    );
    expect(xShare.searchParams.get("url")).toBe(pageUrl);
    expect(facebookShare.searchParams.get("quote")).toBe(
      "This is my life if I live to 83.",
    );
    expect(facebookShare.searchParams.get("u")).toBe(pageUrl);
  });

  it("removes Life-specific state from shared links", () => {
    expect(
      getCleanLifeShareUrl(
        "https://compasscalendar.com/life?variation=random&age=83&utm_source=x",
      ),
    ).toBe("https://compasscalendar.com/life?utm_source=x");
  });
});
