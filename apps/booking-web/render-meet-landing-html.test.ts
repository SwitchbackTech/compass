import { renderMeetLandingHtml } from "./render-meet-landing-html";
import {
  MEET_LANDING_CANONICAL_URL,
  MEET_LANDING_HEADLINE,
  MEET_LANDING_HTML_TITLE,
  MEET_LANDING_META_DESCRIPTION,
} from "./src/landing/meet-landing.copy";
import { describe, expect, it } from "bun:test";
import path from "node:path";

describe("renderMeetLandingHtml", () => {
  it("injects landing SEO tags and crawlable copy", async () => {
    const baseIndexHtml = await Bun.file(
      path.resolve(import.meta.dir, "src/index.html"),
    ).text();
    const html = renderMeetLandingHtml(baseIndexHtml);

    expect(html).toContain(`<title>${MEET_LANDING_HTML_TITLE}</title>`);
    expect(html).toContain(MEET_LANDING_META_DESCRIPTION);
    expect(html).toContain(`href="${MEET_LANDING_CANONICAL_URL}"`);
    expect(html).toContain(MEET_LANDING_HEADLINE);
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("<noscript>");
  });
});
